export interface Ssd {
    id: string;
    name: string;
    brand: string;
    category: 'ssd';

    capacityGb: number;
    interface: string;
    formFactor: string;

    pcieGeneration?: string;
    lanes?: number;

    readSpeedMbps?: number;
    writeSpeedMbps?: number;
}

export interface Hdd {
    id: string;
    name: string;
    brand: string;
    category: 'hdd';

    capacityGb: number;
    rpm: number;
    formFactor: string;
    interface: 'SATA';
}

export type Storage = Ssd | Hdd;