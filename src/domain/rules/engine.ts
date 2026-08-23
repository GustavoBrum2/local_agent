import type { Build } from '../entities/build';
import type { Part } from '../entities/parts';
import type { CompatibilityResult } from '../entities/compatibility';
import { checkSsdCompatibility } from './ssd-rules';
import { checkRamCompatibility } from './ram-rules';
import { checkGpuCompatibility } from './gpu-rules';
import { checkCpuCompatibility } from './cpu-rules';
import { checkMotherboardCompatibility } from './motherboard-rules';
import { checkHddCompatibility } from './hdd-rules';

export function analyzeCompatibility(build: Build, part: Part): CompatibilityResult {
    switch (part.category) {
        case 'cpu':
            return checkCpuCompatibility(build, part);
        case 'motherboard':
            return checkMotherboardCompatibility(build, part);
        case 'ssd':
            return checkSsdCompatibility(build, part);
        case 'ram':
            return checkRamCompatibility(build, part);
        case 'gpu':
            return checkGpuCompatibility(build, part);
        case 'hdd':
            return checkHddCompatibility(build, part);
        default:
            return {
                status: 'insufficient_data',
                partCategory: part.category,
                partName: part.name,
                summary: `Análise de compatibilidade para ${part.category} ainda não implementada.`,
                blockers: [],
                warnings: [],
                reasons: [],
                recommendations: [],
                analyzedAt: new Date().toISOString(),
            };
    }
}
