export interface Gpu {
    id: string;
    name: string;
    brand: string;
    category: 'gpu';

    vramGb: number;
    lengthMm: number;
    slots: number;

    tdp: number;
    requiredPsuWatts: number;

    powerConnectors: string[];

    pcieGeneration: string;
}