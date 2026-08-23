import type { Build } from '../entities/build';
import type { Ssd, M2Slot } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult, type CompatibilityReason } from '../entities/compatibility';

export function checkSsdCompatibility(build: Build, ssd: Ssd): CompatibilityResult {
    const result = createResult('ssd', ssd.name);
    const motherboard = build.motherboard;

    if (!motherboard) {
        result.summary = 'Não é possível analisar sem uma placa-mãe cadastrada na build.';
        result.status = 'insufficient_data';
        return result;
    }

    if (ssd.interface === 'SATA' && ssd.formFactor === '2.5"') {
        checkSataSsd(motherboard.sataConnectors, build.storage.length, result);
    } else if (ssd.formFactor.startsWith('M.2')) {
        checkM2Ssd(motherboard.m2Slots, ssd, result);
    }

    result.status = resolveStatus(result);
    result.summary = buildSummary(result);
    return result;
}

function checkSataSsd(
    sataConnectors: number,
    currentStorageCount: number,
    result: CompatibilityResult,
) {
    if (sataConnectors === 0) {
        addBlocker(result, 'interface', 'A placa-mãe não possui conectores SATA.');
        return;
    }

    if (currentStorageCount >= sataConnectors) {
        addWarning(result, 'slots', 'Todos os conectores SATA já estão ocupados. Será necessário remover um dispositivo.');
    } else {
        addReason(result, 'interface', 'Conector SATA disponível na placa-mãe.');
    }

    addReason(result, 'physical', 'SSD 2.5" é compatível com qualquer gabinete que tenha baia de 2.5".');
}

function checkM2Ssd(
    m2Slots: M2Slot[],
    ssd: Ssd,
    result: CompatibilityResult,
) {
    if (m2Slots.length === 0) {
        addBlocker(result, 'interface', 'A placa-mãe não possui slots M.2.');
        return;
    }

    const compatibleSlots = m2Slots.filter(slot => {
        const formFactorOk = slot.formFactors.includes(ssd.formFactor);
        const interfaceOk = ssd.interface === 'NVMe' ? slot.supportsNvme : slot.supportsSata;
        return formFactorOk && interfaceOk;
    });

    if (compatibleSlots.length === 0) {
        if (ssd.interface === 'NVMe' && m2Slots.every(s => !s.supportsNvme)) {
            addBlocker(result, 'interface', 'Nenhum slot M.2 da placa-mãe suporta NVMe. O SSD não funcionará.');
        } else if (!m2Slots.some(s => s.formFactors.includes(ssd.formFactor))) {
            addBlocker(result, 'physical', `Nenhum slot M.2 suporta o formato ${ssd.formFactor}.`);
        } else {
            addBlocker(result, 'interface', 'Nenhum slot M.2 é compatível com a combinação de interface e formato deste SSD.');
        }
        return;
    }

    addReason(result, 'interface', `${compatibleSlots.length} slot(s) M.2 compatível(is) encontrado(s).`);
    addReason(result, 'physical', `Formato ${ssd.formFactor} suportado.`);

    if (ssd.interface === 'NVMe' && ssd.pcieGeneration) {
        checkPcieGeneration(compatibleSlots, ssd, result);
    }
}

function checkPcieGeneration(
    slots: M2Slot[],
    ssd: Ssd,
    result: CompatibilityResult,
) {
    const bestSlotGen = Math.max(...slots.map(s => s.pcieGeneration));

    if (ssd.pcieGeneration && bestSlotGen < ssd.pcieGeneration) {
        addWarning(
            result,
            'bandwidth',
            `O SSD é PCIe ${ssd.pcieGeneration}.0, mas o melhor slot disponível opera em PCIe ${bestSlotGen}.0. O SSD funcionará, mas com velocidade reduzida.`,
        );
        result.recommendations.push(
            `Considere um SSD PCIe ${bestSlotGen}.0 de menor custo, pois o ganho prático pode ser mais coerente com seu setup atual.`,
        );
    } else {
        addReason(result, 'bandwidth', `Interface PCIe ${bestSlotGen}.0 compatível — desempenho total disponível.`);
    }
}

function addBlocker(result: CompatibilityResult, dimension: string, message: string) {
    result.blockers.push({ dimension, message, severity: 'error' });
}

function addWarning(result: CompatibilityResult, dimension: string, message: string) {
    result.warnings.push({ dimension, message, severity: 'warning' });
}

function addReason(result: CompatibilityResult, dimension: string, message: string) {
    result.reasons.push({ dimension, message, severity: 'info' });
}

function buildSummary(result: CompatibilityResult): string {
    switch (result.status) {
        case 'compatible':
            return 'O SSD é totalmente compatível com sua build atual.';
        case 'incompatible':
            return 'O SSD não é compatível com sua build atual.';
        case 'compatible_with_warnings':
            return 'O SSD funciona no seu PC, mas com limitações importantes.';
        default:
            return 'Dados insuficientes para concluir a análise.';
    }
}
