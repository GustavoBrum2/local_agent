import type { DetectedHardware } from '@/adapters/hardware-detector';
import type { Build } from '@/domain/entities/build';
import type {
    Cpu,
    Gpu,
    Motherboard,
    Ram,
    Ssd,
    Hdd,
} from '@/domain/entities/parts';
import type {
    MotherboardFormFactor,
    PcieGeneration,
    StorageFormFactor,
    StorageInterface,
} from '@/domain/types/common';
import { createEmptyBuild } from '@/domain/entities/build';
import { PartsRepository } from '@/parts-repository';
import { HardwareMatchService } from '@/services/hardware-match-service';
import { sortGpusByPriority } from '@/domain/utils/gpu-selection';

const matcher = new HardwareMatchService(new PartsRepository());

export function hardwareToBuild(detected: DetectedHardware, name = 'Meu PC'): Build {
    const build = createEmptyBuild(name);

    // ──── CPU ────
    if (detected.cpu) {
        const matchedCpu = matcher.findCpu(detected.cpu.modelName);

        build.cpu = matchedCpu
            ? toDomainCpu(matchedCpu)
            : {
                id: crypto.randomUUID(),
                name: detected.cpu.modelName,
                brand: detected.cpu.manufacturer || guessCpuBrand(detected.cpu.modelName),
                category: 'cpu',
                socket: '',
                chipsets: [],
                cores: detected.cpu.cores,
                threads: detected.cpu.threads,
                baseClock: 0,
                tdp: 0,
                rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
            };
    }

    // ──── GPU (múltiplas) ────
    if (detected.gpus.length > 0) {
        build.gpu = sortGpusByPriority(detected.gpus.map(gpu => {
            const matchedGpu = matcher.findGpu(gpu.name);
            return matchedGpu
                ? toDomainGpu(matchedGpu)
                : {
                    id: crypto.randomUUID(),
                    name: gpu.name,
                    brand: gpu.vendor,
                    category: 'gpu' as const,
                    vramGb: 0,
                    lengthMm: 0,
                    slots: 2,
                    tdp: 0,
                    requiredPsuWatts: 0,
                    powerConnectors: [],
                    pcieGeneration: 4,
                    rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
                };
        }));
    }

    // ──── RAM ────
    if (detected.ram) {
        if (detected.ram.sticks.length > 0) {
            build.ram = detected.ram.sticks.map(stick => {
                const detectedRamName = `${stick.manufacturer} ${stick.partNumber} ${stick.capacityGb}GB ${stick.speedMhz}MHz`;
                const matchedRam = matcher.findRam(detectedRamName);

                return matchedRam
                    ? toDomainRam(matchedRam)
                    : {
                        id: crypto.randomUUID(),
                        name: stick.partNumber || `${stick.capacityGb}GB RAM`,
                        brand: stick.manufacturer,
                        category: 'ram' as const,
                        type: guessRamType(stick.speedMhz),
                        capacityGb: stick.capacityGb,
                        speedMhz: stick.speedMhz,
                        modules: 1,
                        rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
                    };
            });
        } else {
            build.ram = [{
                id: crypto.randomUUID(),
                name: `${detected.ram.totalGb}GB RAM (detectado)`,
                brand: '',
                category: 'ram' as const,
                type: 'DDR4',
                capacityGb: detected.ram.totalGb,
                speedMhz: 0,
                modules: detected.ram.modules || 1,
                rawSpecs: 'Detecção do navegador informa apenas capacidade total aproximada.',
            }];
        }
    }

    // ──── Motherboard (native host apenas) ────
    if (detected.motherboard) {
        const motherboardName = `${detected.motherboard.manufacturer} ${detected.motherboard.product}`.trim();
        const matchedMotherboard = matcher.findMotherboard(motherboardName);

        build.motherboard = matchedMotherboard
            ? toDomainMotherboard(matchedMotherboard)
            : {
                id: crypto.randomUUID(),
                name: motherboardName,
                brand: detected.motherboard.manufacturer,
                category: 'motherboard',
                socket: '',
                chipset: '',
                formFactor: 'ATX',
                ramType: 'DDR4',
                ramSlots: 2,
                maxRamCapacity: 64,
                maxRamSpeed: 3200,
                m2Slots: [],
                sataConnectors: 4,
                pcieSlots: [],
                powerConnector: '24-pin ATX',
                rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
            };
    }

    // ──── Storage ────
    if (detected.storage.length > 0) {
        build.storage = detected.storage
            .filter(storage => storage.type === 'fixed')
            .map(storage => {
                const detectedStorageName = `${storage.manufacturer} ${storage.model} ${storage.name}`.trim();
                const matchedStorage = matcher.findStorage(detectedStorageName);

                if (matchedStorage) {
                    return matchedStorage.category === 'hdd'
                        ? toDomainHdd(matchedStorage)
                        : toDomainSsd(matchedStorage);
                }

                const category = guessStorageCategory(storage.mediaType);
                const iface = guessStorageInterface(storage.interfaceType);
                const baseName = storage.name || storage.model || `Disco ${storage.capacityGb}GB`;

                if (category === 'hdd') {
                    return {
                        id: crypto.randomUUID(),
                        name: baseName,
                        brand: storage.manufacturer,
                        category: 'hdd' as const,
                        capacityGb: storage.capacityGb,
                        rpm: 7200,
                        formFactor: '3.5"' as const,
                        interface: 'SATA' as const,
                        rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
                    };
                }

                return {
                    id: crypto.randomUUID(),
                    name: baseName,
                    brand: storage.manufacturer,
                    category: 'ssd' as const,
                    capacityGb: storage.capacityGb,
                    interface: iface,
                    formFactor: guessStorageFormFactor(storage.interfaceType),
                    ...(iface === 'NVMe' ? { pcieGeneration: 4 as const, lanes: 4 } : {}),
                    rawSpecs: 'Detectado automaticamente, mas não encontrado na base local.',
                };
            });
    }

    return build;
}

function toDomainCpu(cpu: import('@/types').Cpu): Cpu {
    return {
        ...cpu,
        category: 'cpu',
        chipsets: cpu.chipsets ?? [],
    };
}

function toDomainGpu(gpu: import('@/types').Gpu): Gpu {
    return {
        ...gpu,
        category: 'gpu',
        pcieGeneration: normalizePcieGeneration(gpu.pcieGeneration),
    };
}

function toDomainRam(ram: import('@/types').Ram): Ram {
    return {
        ...ram,
        category: 'ram',
        type: normalizeRamType(ram.type),
    };
}

function toDomainMotherboard(motherboard: import('@/types').Motherboard): Motherboard {
    return {
        ...motherboard,
        category: 'motherboard',
        formFactor: normalizeMotherboardFormFactor(motherboard.formFactor),
        ramType: normalizeRamType(motherboard.ramType),
        m2Slots: motherboard.m2Slots.map(slot => ({
            ...slot,
            key: normalizeM2Key(slot.key),
            pcieGeneration: normalizePcieGeneration(slot.pcieGeneration),
            formFactors: slot.formFactors.map(normalizeStorageFormFactor),
        })),
        pcieSlots: motherboard.pcieSlots.map(slot => ({
            ...slot,
            generation: normalizePcieGeneration(slot.generation),
            physicalSize: normalizePciePhysicalSize(slot.physicalSize),
        })),
    };
}

function toDomainSsd(ssd: import('@/types').Ssd): Ssd {
    return {
        ...ssd,
        category: 'ssd',
        interface: normalizeStorageInterface(ssd.interface),
        formFactor: normalizeStorageFormFactor(ssd.formFactor),
        pcieGeneration: ssd.pcieGeneration ? normalizePcieGeneration(ssd.pcieGeneration) : undefined,
    };
}

function toDomainHdd(hdd: import('@/types').Hdd): Hdd {
    return {
        ...hdd,
        category: 'hdd',
        formFactor: hdd.formFactor === '2.5"' ? '2.5"' : '3.5"',
        interface: 'SATA',
    };
}

/* ──── Helpers ──── */

function guessRamType(speedMhz: number): 'DDR3' | 'DDR4' | 'DDR5' {
    if (speedMhz >= 4800) return 'DDR5';
    if (speedMhz >= 1600) return 'DDR4';
    return 'DDR3';
}

function guessCpuBrand(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('amd') || lower.includes('ryzen') || lower.includes('athlon')) return 'AMD';
    if (lower.includes('intel') || lower.includes('core') || lower.includes('celeron') || lower.includes('pentium')) return 'Intel';
    if (lower.includes('apple') || lower.includes('m1') || lower.includes('m2') || lower.includes('m3')) return 'Apple';
    return '';
}

function guessStorageCategory(mediaType: string): 'ssd' | 'hdd' {
    const lower = mediaType.toLowerCase();
    if (lower.includes('hdd') || lower.includes('hard')) return 'hdd';
    return 'ssd';
}

function guessStorageInterface(interfaceType: string): StorageInterface {
    const lower = interfaceType.toLowerCase();
    if (lower.includes('nvme') || lower.includes('scsi') || lower.includes('raid')) return 'NVMe';
    return 'SATA';
}

function guessStorageFormFactor(interfaceType: string): StorageFormFactor {
    return guessStorageInterface(interfaceType) === 'NVMe' ? 'M.2 2280' : '2.5"';
}

function normalizeRamType(value: string): 'DDR3' | 'DDR4' | 'DDR5' {
    if (value.toUpperCase().includes('DDR5')) return 'DDR5';
    if (value.toUpperCase().includes('DDR3')) return 'DDR3';
    return 'DDR4';
}

function normalizePcieGeneration(value: string | number | undefined): PcieGeneration {
    const parsed = Number(String(value ?? '').match(/\d+/)?.[0] ?? 4);
    if (parsed >= 5) return 5;
    if (parsed <= 3) return 3;
    return 4;
}

function normalizeMotherboardFormFactor(value: string): MotherboardFormFactor {
    const lower = value.toLowerCase();
    if (lower.includes('mini')) return 'Mini-ITX';
    if (lower.includes('micro') || lower.includes('matx') || lower.includes('m-atx')) return 'Micro-ATX';
    if (lower.includes('e-atx') || lower.includes('eatx')) return 'E-ATX';
    return 'ATX';
}

function normalizeStorageInterface(value: string): StorageInterface {
    return value.toLowerCase().includes('nvme') ? 'NVMe' : 'SATA';
}

function normalizeStorageFormFactor(value: string): StorageFormFactor {
    const lower = value.toLowerCase();
    if (lower.includes('2230')) return 'M.2 2230';
    if (lower.includes('2242')) return 'M.2 2242';
    if (lower.includes('2260')) return 'M.2 2260';
    if (lower.includes('m.2') || lower.includes('2280')) return 'M.2 2280';
    if (lower.includes('3.5')) return '3.5"';
    return '2.5"';
}

function normalizeM2Key(value: string): 'M' | 'B' | 'B+M' {
    if (value === 'B') return 'B';
    if (value === 'B+M') return 'B+M';
    return 'M';
}

function normalizePciePhysicalSize(value: string): 'x1' | 'x4' | 'x8' | 'x16' {
    if (value === 'x1' || value === 'x4' || value === 'x8' || value === 'x16') return value;
    return 'x16';
}
