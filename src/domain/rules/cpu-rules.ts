import type { Build } from '../entities/build';
import type { Cpu } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult } from '../entities/compatibility';

export function checkCpuCompatibility(build: Build, cpu: Cpu): CompatibilityResult {
    const result = createResult('cpu', cpu.name);
    const motherboard = build.motherboard;

    if (!motherboard) {
        result.summary = 'Não é possível analisar o processador sem uma placa-mãe cadastrada na build.';
        result.status = 'insufficient_data';
        return result;
    }

    if (cpu.socket !== motherboard.socket) {
        result.blockers.push({
            dimension: 'socket',
            message: `O processador usa socket ${cpu.socket}, mas a placa-mãe cadastrada usa socket ${motherboard.socket}.`,
            severity: 'error',
        });
    } else {
        result.reasons.push({
            dimension: 'socket',
            message: `Socket ${cpu.socket} compatível com a placa-mãe cadastrada.`,
            severity: 'info',
        });
    }

    if (cpu.chipsets.length > 0) {
        const normalizedBoardChipset = motherboard.chipset.toLowerCase();
        const supported = cpu.chipsets.some(chipset => chipset.toLowerCase() === normalizedBoardChipset);

        if (supported) {
            result.reasons.push({
                dimension: 'chipset',
                message: `Chipset ${motherboard.chipset} aparece como suportado para esse processador na base local.`,
                severity: 'info',
            });
        } else {
            result.warnings.push({
                dimension: 'chipset',
                message: `O socket é compatível, mas o chipset ${motherboard.chipset} não apareceu na lista de chipsets desse processador na base local. Pode exigir validação de BIOS/lista de suporte da fabricante.`,
                severity: 'warning',
            });
        }
    }

    if (!build.cooler) {
        result.warnings.push({
            dimension: 'cooler',
            message: 'Cooler não cadastrado. Não foi possível validar dissipação térmica para o TDP do processador.',
            severity: 'warning',
        });
    } else if (build.cooler.supportedSockets.length > 0 && !build.cooler.supportedSockets.includes(cpu.socket)) {
        result.blockers.push({
            dimension: 'cooler_socket',
            message: `O cooler cadastrado não informa suporte ao socket ${cpu.socket}.`,
            severity: 'error',
        });
    } else if (build.cooler.tdpRating && build.cooler.tdpRating < cpu.tdp) {
        result.warnings.push({
            dimension: 'cooler_tdp',
            message: `O processador tem TDP de ${cpu.tdp}W e o cooler cadastrado é indicado para ${build.cooler.tdpRating}W.`,
            severity: 'warning',
        });
    }

    result.status = resolveStatus(result);
    result.summary = buildSummary(result);
    return result;
}

function buildSummary(result: CompatibilityResult): string {
    switch (result.status) {
        case 'compatible':
            return 'O processador é compatível com a placa-mãe cadastrada.';
        case 'incompatible':
            return 'O processador não é compatível com a build atual.';
        case 'compatible_with_warnings':
            return 'O processador parece compatível, mas exige algumas validações adicionais.';
        default:
            return 'Dados insuficientes para concluir a análise do processador.';
    }
}
