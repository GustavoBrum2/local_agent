import type { CompatibilityStatus, PartCategory } from '../types/common';

export interface CompatibilityReason {
    dimension: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
}

export interface CompatibilityResult {
    status: CompatibilityStatus;
    partCategory: PartCategory;
    partName: string;
    summary: string;
    blockers: CompatibilityReason[];
    warnings: CompatibilityReason[];
    reasons: CompatibilityReason[];
    recommendations: string[];
    analyzedAt: string;
}

export function createResult(
    partCategory: PartCategory,
    partName: string,
): CompatibilityResult {
    return {
        status: 'insufficient_data',
        partCategory,
        partName,
        summary: '',
        blockers: [],
        warnings: [],
        reasons: [],
        recommendations: [],
        analyzedAt: new Date().toISOString(),
    };
}

export function resolveStatus(result: CompatibilityResult): CompatibilityStatus {
    if (result.blockers.length > 0) return 'incompatible';
    if (result.warnings.length > 0) return 'compatible_with_warnings';
    if (result.reasons.length > 0) return 'compatible';
    return 'insufficient_data';
}
