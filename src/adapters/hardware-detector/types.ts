/* ──────────────────────────────────────────────────────────────
 *  Tipos do sistema de detecção de hardware — PC Match
 *  Suporta dois modos: browser-only e native host (preciso).
 * ────────────────────────────────────────────────────────────── */

/** Modo de detecção utilizado */
export type DetectionSource = 'browser' | 'native';

/** Confiança do dado retornado */
export type DetectionConfidence = 'high' | 'medium' | 'low';

/* ──── Dados do Native Host (WMI/CIM) ──── */

export interface NativeHardwareData {
    cpu: {
        Name: string;
        Manufacturer: string;
        NumberOfCores: number;
        NumberOfLogicalProcessors: number;
    } | null;
    system: {
        Manufacturer: string;
        Model: string;
    } | null;
    motherboard: {
        Manufacturer: string;
        Product: string;
        SerialNumber: string;
    } | null;
    gpus: Array<{
        Name: string;
        PNPDeviceID: string;
        DriverVersion: string;
    }>;
    disks: Array<{
        Manufacturer: string;
        Model: string;
        InterfaceType: string;
        MediaType: string;
        Size: number;
        SerialNumber: string;
    }>;
    physicalDisks: Array<{
        FriendlyName: string;
        Manufacturer: string;
        Model: string;
        SerialNumber: string;
        Size: number;
    }>;
    ramSticks: Array<{
        Manufacturer: string;
        PartNumber: string;
        Capacity: number;
        Speed: number;
        DeviceLocator: string;
    }>;
}

/* ──── Dados detectados (unificados) ──── */

export interface DetectedCpu {
    modelName: string;
    manufacturer: string;
    architecture: string;
    cores: number;
    threads: number;
    confidence: DetectionConfidence;
}

export interface DetectedGpu {
    name: string;
    vendor: string;
    driverVersion: string;
    confidence: DetectionConfidence;
}

export interface DetectedRam {
    totalGb: number;
    modules: number;
    sticks: Array<{
        manufacturer: string;
        partNumber: string;
        capacityGb: number;
        speedMhz: number;
        slot: string;
    }>;
    confidence: DetectionConfidence;
}

export interface DetectedStorage {
    name: string;
    manufacturer: string;
    model: string;
    capacityGb: number;
    interfaceType: string;       // 'NVMe' | 'SATA' | 'IDE' | 'SCSI' | 'USB' | ''
    mediaType: string;           // 'SSD' | 'HDD' | 'Unspecified' | ''
    type: 'fixed' | 'removable' | 'unknown';
    confidence: DetectionConfidence;
}

export interface DetectedMotherboard {
    manufacturer: string;
    product: string;
    confidence: DetectionConfidence;
}

export interface DetectedSystem {
    manufacturer: string;
    model: string;
}

/* ──── Resultado unificado de detecção ──── */

export interface DetectedHardware {
    source: DetectionSource;
    cpu: DetectedCpu | null;
    gpus: DetectedGpu[];
    ram: DetectedRam | null;
    storage: DetectedStorage[];
    motherboard: DetectedMotherboard | null;
    system: DetectedSystem | null;
    /** Timestamp ISO da detecção */
    detectedAt: string;
}
