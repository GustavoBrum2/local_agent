export interface Cpu {
    id: string;
    name: string;
    brand: string;
    category: 'cpu';

    socket: string;
    chipsets: string[];

    cores: number;
    threads: number;

    baseClock: number;
    boostClock?: number;

    tdp: number;
}