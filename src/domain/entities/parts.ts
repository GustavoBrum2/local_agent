import type { PartCategory, RamType, StorageInterface, StorageFormFactor, PcieGeneration, MotherboardFormFactor } from '../types/common';

export interface BasePart {
    id: string;
    name: string;
    brand: string;
    category: PartCategory;
    rawSpecs?: string;
}

export interface Cpu extends BasePart {
    category: 'cpu';
    socket: string;
    chipsets: string[];
    cores: number;
    threads: number;
    baseClock: number;
    boostClock?: number;
    tdp: number;
    integratedGraphics?: string;
}

export interface Motherboard extends BasePart {
    category: 'motherboard';
    socket: string;
    chipset: string;
    formFactor: MotherboardFormFactor;
    ramType: RamType;
    ramSlots: number;
    maxRamCapacity: number;
    maxRamSpeed: number;
    m2Slots: M2Slot[];
    sataConnectors: number;
    pcieSlots: PcieSlot[];
    powerConnector: string;
}

export interface M2Slot {
    key: 'M' | 'B' | 'B+M';
    pcieGeneration: PcieGeneration;
    lanes: number;
    supportsNvme: boolean;
    supportsSata: boolean;
    formFactors: StorageFormFactor[];
}

export interface PcieSlot {
    generation: PcieGeneration;
    lanes: number;
    physicalSize: 'x1' | 'x4' | 'x8' | 'x16';
}

export interface Ram extends BasePart {
    category: 'ram';
    type: RamType;
    capacityGb: number;
    speedMhz: number;
    modules: number;
    latency?: string;
}

export interface Gpu extends BasePart {
    category: 'gpu';
    vramGb: number;
    lengthMm: number;
    slots: number;
    tdp: number;
    requiredPsuWatts: number;
    powerConnectors: string[];
    pcieGeneration: PcieGeneration;
}

export interface Ssd extends BasePart {
    category: 'ssd';
    capacityGb: number;
    interface: StorageInterface;
    formFactor: StorageFormFactor;
    pcieGeneration?: PcieGeneration;
    lanes?: number;
    readSpeedMbps?: number;
    writeSpeedMbps?: number;
}

export interface Hdd extends BasePart {
    category: 'hdd';
    capacityGb: number;
    rpm: number;
    formFactor: '2.5"' | '3.5"';
    interface: 'SATA';
}

export interface Psu extends BasePart {
    category: 'psu';
    wattage: number;
    efficiency?: string;
    modular?: 'full' | 'semi' | 'no';
    connectors: PsuConnectors;
}

export interface PsuConnectors {
    atx24pin: number;
    cpu8pin: number;
    cpu4pin: number;
    pcie8pin: number;
    pcie6pin: number;
    sata: number;
    molex: number;
}

export interface Case extends BasePart {
    category: 'case';
    supportedFormFactors: MotherboardFormFactor[];
    maxGpuLengthMm: number;
    maxCoolerHeightMm: number;
    driveBays35: number;
    driveBays25: number;
}

export interface Cooler extends BasePart {
    category: 'cooler';
    type: 'air' | 'aio';
    heightMm: number;
    supportedSockets: string[];
    tdpRating?: number;
    radiatorSize?: number;
}

export type Part = Cpu | Motherboard | Ram | Gpu | Ssd | Hdd | Psu | Case | Cooler;
