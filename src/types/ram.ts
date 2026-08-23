export interface Ram {
    id: string;
    name: string;
    brand: string;
    category: 'ram';

    type: string;
    capacityGb: number;
    speedMhz: number;
    modules: number;

    latency?: string;
}