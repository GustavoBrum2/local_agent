import type { Build } from '../entities/build';
import type { Gpu } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult } from '../entities/compatibility';

export function checkGpuCompatibility(build: Build, gpu: Gpu): CompatibilityResult {
    const result = createResult('gpu', gpu.name);
    const motherboard = build.motherboard;

    if (!motherboard) {
        result.summary = 'Não é possível analisar sem uma placa-mãe cadastrada na build.';
        result.status = 'insufficient_data';
        return result;
    }

    checkPcieSlot(motherboard.pcieSlots, gpu, result);
    checkPhysicalFit(build, gpu, result);
    checkPowerRequirements(build, gpu, result);

    result.status = resolveStatus(result);
    result.summary = buildSummary(result);
    return result;
}

function checkPcieSlot(
    pcieSlots: { generation: number; lanes: number; physicalSize: string }[],
    gpu: Gpu,
    result: CompatibilityResult,
) {
    const x16Slots = pcieSlots.filter(s => s.physicalSize === 'x16');

    if (x16Slots.length === 0) {
        result.blockers.push({
            dimension: 'pcie',
            message: 'A placa-mãe não possui slot PCIe x16 para a GPU.',
            severity: 'error',
        });
        return;
    }

    result.reasons.push({
        dimension: 'pcie',
        message: 'Slot PCIe x16 disponível na placa-mãe.',
        severity: 'info',
    });

    const bestGen = Math.max(...x16Slots.map(s => s.generation));
    if (bestGen < gpu.pcieGeneration) {
        result.warnings.push({
            dimension: 'pcie_bandwidth',
            message: `A GPU usa PCIe ${gpu.pcieGeneration}.0, mas o melhor slot disponível é PCIe ${bestGen}.0. Pode haver perda marginal de desempenho.`,
            severity: 'warning',
        });
    }
}

function checkPhysicalFit(build: Build, gpu: Gpu, result: CompatibilityResult) {
    if (!build.case) {
        result.warnings.push({
            dimension: 'physical',
            message: 'Gabinete não cadastrado. Não é possível verificar se a GPU cabe fisicamente.',
            severity: 'warning',
        });
        return;
    }

    if (gpu.lengthMm > build.case.maxGpuLengthMm) {
        result.blockers.push({
            dimension: 'physical',
            message: `A GPU tem ${gpu.lengthMm}mm, mas o gabinete suporta no máximo ${build.case.maxGpuLengthMm}mm.`,
            severity: 'error',
        });
    } else {
        result.reasons.push({
            dimension: 'physical',
            message: `GPU de ${gpu.lengthMm}mm cabe no gabinete (máx: ${build.case.maxGpuLengthMm}mm).`,
            severity: 'info',
        });
    }
}

function checkPowerRequirements(build: Build, gpu: Gpu, result: CompatibilityResult) {
    if (!build.psu) {
        result.warnings.push({
            dimension: 'power',
            message: 'Fonte não cadastrada. Não é possível verificar se a alimentação é suficiente.',
            severity: 'warning',
        });
        return;
    }

    const estimatedSystemDraw = estimateSystemPower(build);
    const totalRequired = estimatedSystemDraw + gpu.tdp;
    const margin = build.psu.wattage - totalRequired;

    if (margin < 0) {
        result.blockers.push({
            dimension: 'power',
            message: `Consumo estimado de ${totalRequired}W excede a capacidade da fonte de ${build.psu.wattage}W.`,
            severity: 'error',
        });
        result.recommendations.push(
            `Considere uma fonte de pelo menos ${totalRequired + 100}W para manter margem de segurança.`,
        );
    } else if (margin < 100) {
        result.warnings.push({
            dimension: 'power',
            message: `Consumo estimado de ${totalRequired}W deixa apenas ${margin}W de margem na fonte de ${build.psu.wattage}W. Recomenda-se pelo menos 100W de folga.`,
            severity: 'warning',
        });
    } else {
        result.reasons.push({
            dimension: 'power',
            message: `Fonte de ${build.psu.wattage}W comporta o consumo estimado de ${totalRequired}W com ${margin}W de margem.`,
            severity: 'info',
        });
    }

    // Verificar conectores de alimentação
    const needed8pin = gpu.powerConnectors.filter(c => c.includes('8')).length;
    const needed6pin = gpu.powerConnectors.filter(c => c.includes('6') && !c.includes('8')).length;

    if (needed8pin > build.psu.connectors.pcie8pin) {
        result.blockers.push({
            dimension: 'connectors',
            message: `A GPU requer ${needed8pin} conector(es) PCIe 8-pin, mas a fonte possui apenas ${build.psu.connectors.pcie8pin}.`,
            severity: 'error',
        });
    }

    if (needed6pin > build.psu.connectors.pcie6pin) {
        result.warnings.push({
            dimension: 'connectors',
            message: `A GPU requer ${needed6pin} conector(es) PCIe 6-pin, mas a fonte possui apenas ${build.psu.connectors.pcie6pin}.`,
            severity: 'warning',
        });
    }
}

function estimateSystemPower(build: Build): number {
    let power = 50; // base (mobo, fans, etc.)
    if (build.cpu) power += build.cpu.tdp;
    // RAM e storage consomem pouco, estimar ~20W
    power += build.ram.length * 5;
    power += build.storage.length * 8;
    return power;
}

function buildSummary(result: CompatibilityResult): string {
    switch (result.status) {
        case 'compatible':
            return 'A GPU é totalmente compatível com sua build atual.';
        case 'incompatible':
            return 'A GPU não é compatível com sua build atual.';
        case 'compatible_with_warnings':
            return 'A GPU funciona no seu PC, mas com ressalvas importantes.';
        default:
            return 'Dados insuficientes para concluir a análise.';
    }
}
