import type { Build } from '../entities/build';
import type { Hdd } from '../entities/parts';
import { createResult, resolveStatus, type CompatibilityResult } from '../entities/compatibility';

export function checkHddCompatibility(build: Build, hdd: Hdd): CompatibilityResult {
    const result = createResult('hdd', hdd.name);
    const motherboard = build.motherboard;

    if (!motherboard) {
        result.summary = 'Não é possível analisar HD SATA sem uma placa-mãe cadastrada na build.';
        result.status = 'insufficient_data';
        return result;
    }

    if (motherboard.sataConnectors <= 0) {
        result.blockers.push({
            dimension: 'sata',
            message: 'A placa-mãe cadastrada não possui conectores SATA informados.',
            severity: 'error',
        });
    } else {
        const usedSata = build.storage.filter(storage => storage.interface === 'SATA').length;
        if (usedSata >= motherboard.sataConnectors) {
            result.warnings.push({
                dimension: 'sata',
                message: `Todos os ${motherboard.sataConnectors} conector(es) SATA parecem ocupados. Pode ser necessário substituir/remover um disco atual.`,
                severity: 'warning',
            });
        } else {
            result.reasons.push({
                dimension: 'sata',
                message: `Há ${motherboard.sataConnectors - usedSata} conector(es) SATA livre(s) para adicionar o HD.`,
                severity: 'info',
            });
        }
    }

    if (build.case) {
        const hasBay = hdd.formFactor === '3.5"' ? build.case.driveBays35 > 0 : build.case.driveBays25 > 0;
        if (!hasBay) {
            result.warnings.push({
                dimension: 'bay',
                message: `Gabinete cadastrado não informa baia livre/compatível para HD ${hdd.formFactor}.`,
                severity: 'warning',
            });
        } else {
            result.reasons.push({
                dimension: 'bay',
                message: `Gabinete possui baia compatível com HD ${hdd.formFactor}.`,
                severity: 'info',
            });
        }
    } else {
        result.warnings.push({
            dimension: 'case',
            message: 'Gabinete não cadastrado. Não foi possível validar baia física para o HD.',
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
            return 'O HD SATA é compatível com sua build atual.';
        case 'incompatible':
            return 'O HD SATA não é compatível com sua build atual.';
        case 'compatible_with_warnings':
            return 'O HD SATA pode funcionar, mas exige validação de portas/baia física.';
        default:
            return 'Dados insuficientes para concluir a análise do HD.';
    }
}
