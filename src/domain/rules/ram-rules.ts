import type { Build } from '../entities/build';
import type { Ram } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult } from '../entities/compatibility';

export function checkRamCompatibility(build: Build, ram: Ram): CompatibilityResult {
    const result = createResult('ram', ram.name);
    const motherboard = build.motherboard;

    if (!motherboard) {
        result.summary = 'Não é possível analisar sem uma placa-mãe cadastrada na build.';
        result.status = 'insufficient_data';
        return result;
    }

    checkRamType(motherboard.ramType, ram, result);
    checkRamCapacity(motherboard.maxRamCapacity, motherboard.ramSlots, ram, build.ram, result);
    checkRamSpeed(motherboard.maxRamSpeed, ram, result);
    checkRamSlots(motherboard.ramSlots, ram, build.ram, result);

    result.status = resolveStatus(result);
    result.summary = buildSummary(result);
    return result;
}

function checkRamType(
    boardRamType: string,
    ram: Ram,
    result: CompatibilityResult,
) {
    if (ram.type !== boardRamType) {
        result.blockers.push({
            dimension: 'ram_type',
            message: `A memória é ${ram.type}, mas a placa-mãe suporta apenas ${boardRamType}. São fisicamente incompatíveis.`,
            severity: 'error',
        });
    } else {
        result.reasons.push({
            dimension: 'ram_type',
            message: `Tipo de memória ${ram.type} compatível com a placa-mãe.`,
            severity: 'info',
        });
    }
}

function checkRamCapacity(
    maxCapacity: number,
    totalSlots: number,
    ram: Ram,
    existingRam: Ram[],
    result: CompatibilityResult,
) {
    const existingTotal = existingRam.reduce((sum, r) => sum + r.capacityGb, 0);
    const newTotalIfAdded = existingTotal + ram.capacityGb;
    const capacityPerModule = ram.modules > 0 ? ram.capacityGb / ram.modules : ram.capacityGb;

    if (maxCapacity <= 0) {
        result.warnings.push({
            dimension: 'capacity',
            message: 'A placa-mãe cadastrada não possui limite máximo de RAM informado na base. A capacidade não foi usada como critério bloqueante.',
            severity: 'warning',
        });
        return;
    }

    if (ram.capacityGb > maxCapacity) {
        result.blockers.push({
            dimension: 'capacity',
            message: `O kit possui ${ram.capacityGb}GB, acima do limite de ${maxCapacity}GB da placa-mãe.`,
            severity: 'error',
        });
    } else if (newTotalIfAdded > maxCapacity) {
        result.warnings.push({
            dimension: 'capacity',
            message: `Se esse kit for somado à RAM atual, a capacidade chegaria a ${newTotalIfAdded}GB, acima do limite de ${maxCapacity}GB. Pode ser necessário substituir os módulos atuais em vez de adicionar.`,
            severity: 'warning',
        });
        result.reasons.push({
            dimension: 'capacity',
            message: `O kit de ${ram.capacityGb}GB, isoladamente, está dentro do limite de ${maxCapacity}GB da placa-mãe.`,
            severity: 'info',
        });
    } else {
        result.reasons.push({
            dimension: 'capacity',
            message: `Capacidade estimada de ${newTotalIfAdded}GB dentro do limite de ${maxCapacity}GB da placa-mãe.`,
            severity: 'info',
        });
    }

    if (totalSlots > 0) {
        const maxPerSlot = maxCapacity / totalSlots;
        if (capacityPerModule > maxPerSlot) {
            result.warnings.push({
                dimension: 'capacity',
                message: `Cada módulo parece ter ${capacityPerModule}GB, mas o máximo estimado por slot é ${maxPerSlot}GB. Confirme no manual da placa-mãe.`,
                severity: 'warning',
            });
        }
    }
}

function checkRamSpeed(
    maxSpeed: number,
    ram: Ram,
    result: CompatibilityResult,
) {
    if (maxSpeed <= 0) {
        result.warnings.push({
            dimension: 'speed',
            message: 'A placa-mãe cadastrada não possui velocidade máxima de RAM informada na base. A frequência não foi usada como critério bloqueante.',
            severity: 'warning',
        });
        return;
    }

    if (ram.speedMhz > maxSpeed) {
        result.warnings.push({
            dimension: 'speed',
            message: `A memória opera a ${ram.speedMhz}MHz, mas a placa-mãe suporta até ${maxSpeed}MHz. Funcionará, mas limitada à velocidade máxima da placa.`,
            severity: 'warning',
        });
        result.recommendations.push(
            `Considere uma memória de até ${maxSpeed}MHz para não pagar a mais por velocidade que não será aproveitada.`,
        );
    } else {
        result.reasons.push({
            dimension: 'speed',
            message: `Velocidade de ${ram.speedMhz}MHz suportada pela placa-mãe.`,
            severity: 'info',
        });
    }
}

function checkRamSlots(
    totalSlots: number,
    ram: Ram,
    existingRam: Ram[],
    result: CompatibilityResult,
) {
    if (totalSlots <= 0) {
        result.warnings.push({
            dimension: 'slots',
            message: 'A placa-mãe cadastrada não possui quantidade de slots de RAM informada na base.',
            severity: 'warning',
        });
        return;
    }

    const usedSlots = existingRam.reduce((sum, r) => sum + r.modules, 0);
    const neededSlotsIfAdded = usedSlots + ram.modules;

    if (ram.modules > totalSlots) {
        result.blockers.push({
            dimension: 'slots',
            message: `O kit precisa de ${ram.modules} slot(s), mas a placa-mãe possui apenas ${totalSlots}.`,
            severity: 'error',
        });
    } else if (neededSlotsIfAdded > totalSlots) {
        result.warnings.push({
            dimension: 'slots',
            message: `Se esse kit for somado à RAM atual, seriam usados ${neededSlotsIfAdded} slots, mas a placa-mãe possui ${totalSlots}. Pode ser necessário substituir módulos atuais em vez de adicionar.`,
            severity: 'warning',
        });
        result.reasons.push({
            dimension: 'slots',
            message: `O kit precisa de ${ram.modules} slot(s), quantidade suportada pela placa-mãe.`,
            severity: 'info',
        });
    } else {
        result.reasons.push({
            dimension: 'slots',
            message: `${totalSlots - usedSlots} slot(s) livre(s) disponível(is) para ${ram.modules} módulo(s).`,
            severity: 'info',
        });
    }

    if (existingRam.length > 0) {
        const existingType = existingRam[0].type;
        if (ram.type === existingType && ram.speedMhz !== existingRam[0].speedMhz) {
            result.warnings.push({
                dimension: 'mixed_speed',
                message: `Misturar módulos de velocidades diferentes (${ram.speedMhz}MHz com ${existingRam[0].speedMhz}MHz) fará todos operarem na menor velocidade.`,
                severity: 'warning',
            });
        }
    }
}

function buildSummary(result: CompatibilityResult): string {
    switch (result.status) {
        case 'compatible':
            return 'A memória RAM é totalmente compatível com sua build atual.';
        case 'incompatible':
            return 'A memória RAM não é compatível com sua build atual.';
        case 'compatible_with_warnings':
            return 'A memória RAM funciona no seu PC, mas com limitações.';
        default:
            return 'Dados insuficientes para concluir a análise.';
    }
}
