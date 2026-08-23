export interface M2Slot {
    key: string;
    pcieGeneration: string;
    lanes: number;
    supportsNvme: boolean;
    supportsSata: boolean;
    formFactors: string[];
}

export interface PcieSlot {
    generation: string;
    lanes: number;
    physicalSize: string;
}

export interface Motherboard {
    id: string;
    name: string;
    brand: string;
    category: 'motherboard';

    socket: string;
    chipset: string;
    formFactor: string;

    ramType: string;
    ramSlots: number;
    maxRamCapacity: number;
    maxRamSpeed: number;

    m2Slots: M2Slot[];
    sataConnectors: number;
    pcieSlots: PcieSlot[];

    powerConnector: string;
}