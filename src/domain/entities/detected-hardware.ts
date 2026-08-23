/** Categoria detectada do hardware na página de produto */
export type HardwareCategory =
    | 'memory'
    | 'cpu'
    | 'motherboard'
    | 'gpu'
    | 'storage'
    | 'psu'
    | 'case'
    | 'cooler'
    | 'unknown_hardware'
    | 'not_hardware';

/** Nível de confiança da detecção */
export type PageDetectionConfidence = 'high' | 'medium' | 'low' | 'none';

/** Atributos de memória RAM */
export interface MemoryAttributes {
    capacityGb?: number;
    memoryType?: string;
    speedMhz?: number;
    casLatency?: number;
    formFactor?: string;
    voltage?: number;
    moduleCount?: number;
    ecc?: boolean;
    registered?: boolean;
}

/** Atributos de processador */
export interface CpuAttributes {
    line?: string;
    socket?: string;
    cores?: number;
    threads?: number;
    baseClockGhz?: number;
    boostClockGhz?: number;
    cache?: string;
    tdpW?: number;
    integratedGraphics?: string;
}

/** Atributos de placa-mãe */
export interface MotherboardAttributes {
    socket?: string;
    chipset?: string;
    formFactor?: string;
    memoryType?: string;
    memorySlots?: number;
    maxMemoryGb?: number;
    supportedSpeeds?: number[];
    m2Slots?: number;
    sataPorts?: number;
    pcieVersion?: string;
}

/** Atributos de placa de vídeo */
export interface GpuAttributes {
    chipset?: string;
    vramGb?: number;
    memoryType?: string;
    interface?: string;
    lengthMm?: number;
    recommendedPsuW?: number;
    powerConnectors?: string[];
}

/** Atributos de armazenamento */
export interface StorageAttributes {
    storageType?: string;
    capacityGb?: number;
    formFactor?: string;
    interface?: string;
    readSpeedMbs?: number;
    writeSpeedMbs?: number;
}

/** Atributos de fonte de alimentação */
export interface PsuAttributes {
    wattageW?: number;
    efficiency?: string;
    modularity?: string;
    pfcType?: string;
    formFactor?: string;
    atxVersion?: string;
    pcie5Support?: boolean;
    twelveVhpwrSupport?: boolean;
}

/** Atributos de gabinete */
export interface CaseAttributes {
    supportedMotherboardFormFactors?: string[];
    maxGpuLengthMm?: number;
    maxCoolerHeightMm?: number;
    supportedRadiatorSizes?: number[];
    psuFormFactor?: string;
}

/** Atributos de cooler */
export interface CoolerAttributes {
    coolerType?: string;
    supportedSockets?: string[];
    heightMm?: number;
    radiatorSizeMm?: number;
    fanSizeMm?: number;
    tdpW?: number;
}

/** União de todos os atributos de hardware possíveis */
export type HardwareAttributes =
    | MemoryAttributes
    | CpuAttributes
    | MotherboardAttributes
    | GpuAttributes
    | StorageAttributes
    | PsuAttributes
    | CaseAttributes
    | CoolerAttributes
    | Record<string, unknown>;

/** Hardware detectado em uma página de produto */
export interface DetectedHardware {
    id: string;
    url: string;
    domain: string;
    title: string;
    brand?: string;
    model?: string;
    category: HardwareCategory;
    confidence: PageDetectionConfidence;
    extractedAt: string;
    rawSignals: string[];
    attributes: HardwareAttributes;
}

/** Resultado da verificação se a página parece ser de produto */
export interface ProductPageDetectionResult {
    isProductPage: boolean;
    confidence: number; // 0 a 1
    reasons: string[];
}

/** Resultado da classificação de categoria de hardware */
export interface HardwareClassificationResult {
    category: HardwareCategory;
    confidence: PageDetectionConfidence;
    matchedKeywords: string[];
    reasons: string[];
}
