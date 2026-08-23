import type { Cpu, Motherboard, Ram, Gpu, Ssd, Hdd, Psu, Case, Cooler } from './parts';

export interface Build {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    cpu?: Cpu;
    motherboard?: Motherboard;
    ram: Ram[];
    gpu: Gpu[];
    storage: (Ssd | Hdd)[];
    psu?: Psu;
    case?: Case;
    cooler?: Cooler;
}

export function createEmptyBuild(name: string): Build {
    return {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ram: [],
        gpu: [],
        storage: [],
    };
}
