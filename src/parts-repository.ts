import cpus from './data/cpus.json';
import gpus from './data/gpus.json';
import motherboards from './data/motherboards.json';
import ram from './data/ram.json';
import ssds from './data/ssds.json';
import hdds from './data/hdds.json';

import type { Cpu, Gpu, Motherboard, Ram, Ssd, Hdd, Storage } from './types';

export class PartsRepository {
    getCpus(): Cpu[] {
        return cpus as Cpu[];
    }

    getGpus(): Gpu[] {
        return gpus as Gpu[];
    }

    getMotherboards(): Motherboard[] {
        return motherboards as Motherboard[];
    }

    getRam(): Ram[] {
        return ram as Ram[];
    }

    getSsds(): Ssd[] {
        return ssds as Ssd[];
    }

    getHdds(): Hdd[] {
        return hdds as Hdd[];
    }

    getStorage(): Storage[] {
        return [...this.getSsds(), ...this.getHdds()];
    }
}