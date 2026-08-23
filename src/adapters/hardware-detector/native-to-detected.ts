/* ──────────────────────────────────────────────────────────────
 *  Converte NativeHardwareData (WMI/CIM) → DetectedHardware
 *  Todos os dados vindos do native host recebem confidence: 'high'
 * ────────────────────────────────────────────────────────────── */

import type {
    NativeHardwareData,
    DetectedHardware,
    DetectedCpu,
    DetectedGpu,
    DetectedRam,
    DetectedStorage,
    DetectedMotherboard,
    DetectedSystem,
} from './types';
import { sortGpusByPriority } from '@/domain/utils/gpu-selection';

export function nativeDataToDetected(data: NativeHardwareData): DetectedHardware {
    return {
        source: 'native',
        cpu: convertCpu(data),
        gpus: convertGpus(data),
        ram: convertRam(data),
        storage: convertStorage(data),
        motherboard: convertMotherboard(data),
        system: convertSystem(data),
        detectedAt: new Date().toISOString(),
    };
}

function convertCpu(data: NativeHardwareData): DetectedCpu | null {
    const c = data.cpu;
    if (!c?.Name) return null;

    return {
        modelName: c.Name.trim(),
        manufacturer: c.Manufacturer?.trim() || '',
        architecture: c.Name.toLowerCase().includes('64') ? 'x86_64' : 'x86',
        cores: c.NumberOfCores || 0,
        threads: c.NumberOfLogicalProcessors || 0,
        confidence: 'high',
    };
}

/** Nomes de adaptadores virtuais que devem ser ignorados */
const VIRTUAL_GPU_PATTERNS = [
    'ms idd',
    'idd device',
    'microsoft idd',
    'microsoft indirect',
    'indirect display',
    'microsoft remote',
    'remote desktop',
    'microsoft basic display',
    'basic render',
    'rdp',
    'virtual',
    'vnc',
    'parsec',
    'teamviewer',
];

function isVirtualGpu(name: string): boolean {
    const lower = name.toLowerCase();
    return VIRTUAL_GPU_PATTERNS.some(p => lower.includes(p));
}

function convertGpus(data: NativeHardwareData): DetectedGpu[] {
    const gpus = data.gpus || [];
    if (gpus.length === 0) return [];

    // Filtrar GPUs virtuais
    const realGpus = gpus.filter(g => g.Name && !isVirtualGpu(g.Name));
    if (realGpus.length === 0) return [];

    const mapped = realGpus.map(gpu => ({
        name: gpu.Name?.trim() || 'GPU desconhecida',
        vendor: guessGpuVendor(gpu.Name || '', gpu.PNPDeviceID || ''),
        driverVersion: gpu.DriverVersion?.trim() || '',
        confidence: 'high' as const,
    }));

    return sortGpusByPriority(mapped);
}

function convertRam(data: NativeHardwareData): DetectedRam | null {
    const sticks = data.ramSticks || [];
    if (sticks.length === 0) return null;

    const convertedSticks = sticks.map(s => ({
        manufacturer: s.Manufacturer?.trim() || '',
        partNumber: s.PartNumber?.trim() || '',
        capacityGb: s.Capacity ? Math.round(s.Capacity / (1024 * 1024 * 1024)) : 0,
        speedMhz: s.Speed || 0,
        slot: s.DeviceLocator?.trim() || '',
    }));

    const totalGb = convertedSticks.reduce((sum, s) => sum + s.capacityGb, 0);

    return {
        totalGb,
        modules: convertedSticks.length,
        sticks: convertedSticks,
        confidence: 'high',
    };
}

function convertStorage(data: NativeHardwareData): DetectedStorage[] {
    // Preferir physicalDisks (Get-PhysicalDisk) — nomes mais limpos
    // Enriquecer com Win32_DiskDrive para interfaceType/mediaType
    const physical = data.physicalDisks || [];
    const wmi = data.disks || [];

    if (physical.length > 0) {
        return physical.map((pd, i) => {
            const wmiDisk = wmi[i]; // match por índice (heurística simples)
            return {
                name: pd.FriendlyName?.trim() || pd.Model?.trim() || 'Disco desconhecido',
                manufacturer: pd.Manufacturer?.trim() || '',
                model: pd.Model?.trim() || '',
                capacityGb: pd.Size ? Math.round(pd.Size / (1024 * 1024 * 1024)) : 0,
                interfaceType: normalizeInterfaceType(wmiDisk?.InterfaceType || ''),
                mediaType: normalizeMediaType(wmiDisk?.MediaType || ''),
                type: 'fixed' as const,
                confidence: 'high' as const,
            };
        });
    }

    // Fallback para Win32_DiskDrive
    return wmi.map(d => ({
        name: d.Model?.trim() || 'Disco desconhecido',
        manufacturer: d.Manufacturer?.trim() || '',
        model: d.Model?.trim() || '',
        capacityGb: d.Size ? Math.round(d.Size / (1024 * 1024 * 1024)) : 0,
        interfaceType: normalizeInterfaceType(d.InterfaceType || ''),
        mediaType: normalizeMediaType(d.MediaType || ''),
        type: 'fixed' as const,
        confidence: 'high' as const,
    }));
}

function convertMotherboard(data: NativeHardwareData): DetectedMotherboard | null {
    const mb = data.motherboard;
    if (!mb?.Product) return null;

    return {
        manufacturer: mb.Manufacturer?.trim() || '',
        product: mb.Product?.trim() || '',
        confidence: 'high',
    };
}

function convertSystem(data: NativeHardwareData): DetectedSystem | null {
    const sys = data.system;
    if (!sys?.Model) return null;

    return {
        manufacturer: sys.Manufacturer?.trim() || '',
        model: sys.Model?.trim() || '',
    };
}

/* ──── Helpers ──── */

function guessGpuVendor(name: string, pnpId: string): string {
    const combined = `${name} ${pnpId}`.toLowerCase();
    if (combined.includes('nvidia') || combined.includes('ven_10de')) return 'NVIDIA';
    if (combined.includes('amd') || combined.includes('ati') || combined.includes('ven_1002')) return 'AMD';
    if (combined.includes('intel') || combined.includes('ven_8086')) return 'Intel';
    return '';
}

function normalizeInterfaceType(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (lower.includes('nvme')) return 'NVMe';
    if (lower.includes('scsi') || lower.includes('raid')) return 'NVMe';  // NVMe aparece como SCSI no Windows
    if (lower.includes('sata') || lower.includes('ide')) return 'SATA';
    if (lower.includes('usb')) return 'USB';
    return raw.trim();
}

function normalizeMediaType(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (lower.includes('ssd') || lower.includes('solid')) return 'SSD';
    if (lower.includes('hdd') || lower.includes('hard')) return 'HDD';
    if (lower === 'fixed hard disk media') return 'HDD';
    return raw.trim();
}
