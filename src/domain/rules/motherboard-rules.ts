import type { Build } from '../entities/build';
import type { Motherboard } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult } from '../entities/compatibility';

export function checkMotherboardCompatibility(build: Build, motherboard: Motherboard): CompatibilityResult {
    const result = createResult('motherboard', motherboard.name);

    if (build.cpu) {
        if (build.cpu.socket !== motherboard.socket) {
            result.blockers.push({
                dimension: 'socket',
                message: `Sua CPU cadastrada usa socket ${build.cpu.socket}, mas a placa-mãe analisada usa socket ${motherboard.socket}.`,
                severity: 'error',
            });
        } else {
            result.reasons.push({
                dimension: 'socket',
                message: `Socket ${motherboard.socket} compatível com a CPU cadastrada.`,
                severity: 'info',
            });
        }

        if (build.cpu.chipsets.length > 0) {
            const supported = build.cpu.chipsets.some(chipset => chipset.toLowerCase() === motherboard.chipset.toLowerCase());
            if (supported) {
                result.reasons.push({
                    dimension: 'chipset',
                    message: `Chipset ${motherboard.chipset} aparece como suportado para sua CPU na base local.`,
                    severity: 'info',
                });
            } else {
                result.warnings.push({
                    dimension: 'chipset',
                    message: `O chipset ${motherboard.chipset} não apareceu na lista de chipsets da CPU cadastrada. Pode exigir validação de BIOS/lista de suporte da fabricante.`,
                    severity: 'warning',
                });
            }
        }
    } else {
        result.warnings.push({
            dimension: 'cpu',
            message: 'CPU não cadastrada. A compatibilidade de socket/chipset não pôde ser validada.',
            severity: 'warning',
        });
    }

    for (const ram of build.ram) {
        if (ram.type !== motherboard.ramType) {
            result.blockers.push({
                dimension: 'ram_type',
                message: `Sua memória ${ram.name} é ${ram.type}, mas a placa-mãe analisada suporta ${motherboard.ramType}.`,
                severity: 'error',
            });
        }
    }

    const totalRamCapacity = build.ram.reduce((sum, ram) => sum + ram.capacityGb, 0);
    const usedRamSlots = build.ram.reduce((sum, ram) => sum + ram.modules, 0);

    if (totalRamCapacity > motherboard.maxRamCapacity) {
        result.blockers.push({
            dimension: 'ram_capacity',
            message: `Sua RAM total é ${totalRamCapacity}GB, mas a placa-mãe analisada suporta no máximo ${motherboard.maxRamCapacity}GB.`,
            severity: 'error',
        });
    } else if (build.ram.length > 0) {
        result.reasons.push({
            dimension: 'ram_capacity',
            message: `Capacidade de RAM cadastrada dentro do limite da placa-mãe analisada.`,
            severity: 'info',
        });
    }

    if (usedRamSlots > motherboard.ramSlots) {
        result.blockers.push({
            dimension: 'ram_slots',
            message: `Sua build usa ${usedRamSlots} módulo(s) de RAM, mas a placa-mãe analisada possui ${motherboard.ramSlots} slot(s).`,
            severity: 'error',
        });
    }

    if (build.gpu.length > 0) {
        const hasX16Slot = motherboard.pcieSlots.some(slot => slot.physicalSize === 'x16');
        if (!hasX16Slot) {
            result.blockers.push({
                dimension: 'pcie',
                message: 'A placa-mãe analisada não possui slot PCIe x16 para a GPU cadastrada.',
                severity: 'error',
            });
        } else {
            result.reasons.push({
                dimension: 'pcie',
                message: 'Slot PCIe x16 disponível para a GPU cadastrada.',
                severity: 'info',
            });
        }
    }

    const sataStorageCount = build.storage.filter(storage => storage.interface === 'SATA').length;
    if (sataStorageCount > motherboard.sataConnectors) {
        result.blockers.push({
            dimension: 'sata',
            message: `Sua build possui ${sataStorageCount} dispositivo(s) SATA, mas a placa-mãe analisada possui ${motherboard.sataConnectors} conector(es) SATA.`,
            severity: 'error',
        });
    }

    const nvmeStorageCount = build.storage.filter(storage => storage.category === 'ssd' && storage.interface === 'NVMe').length;
    const nvmeSlots = motherboard.m2Slots.filter(slot => slot.supportsNvme).length;
    if (nvmeStorageCount > nvmeSlots) {
        result.blockers.push({
            dimension: 'm2_nvme',
            message: `Sua build possui ${nvmeStorageCount} SSD(s) NVMe, mas a placa-mãe analisada possui ${nvmeSlots} slot(s) M.2 NVMe compatíveis.`,
            severity: 'error',
        });
    }

    result.status = resolveStatus(result);
    result.summary = buildSummary(result);
    return result;
}

function buildSummary(result: CompatibilityResult): string {
    switch (result.status) {
        case 'compatible':
            return 'A placa-mãe é compatível com os principais componentes cadastrados.';
        case 'incompatible':
            return 'A placa-mãe não é compatível com a build atual.';
        case 'compatible_with_warnings':
            return 'A placa-mãe parece compatível, mas exige algumas validações adicionais.';
        default:
            return 'Dados insuficientes para concluir a análise da placa-mãe.';
    }
}
