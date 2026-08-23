import { PartsRepository } from '../parts-repository';

import type {
    Cpu,
    Gpu,
    Motherboard,
    Ram,
    Storage,
} from '../types';

interface MatchCandidate<T> {
    part: T;
    score: number;
}

export class HardwareMatchService {
    constructor(
        private readonly repository: PartsRepository,
    ) { }

    findCpu(name: string): Cpu | undefined {
        return this.findBestMatch(this.repository.getCpus(), name);
    }

    findGpu(name: string): Gpu | undefined {
        return this.findBestMatch(this.repository.getGpus(), name);
    }

    findMotherboard(name: string): Motherboard | undefined {
        return this.findBestMatch(this.repository.getMotherboards(), name);
    }

    findRam(name: string): Ram | undefined {
        return this.findBestMatch(this.repository.getRam(), name);
    }

    findStorage(name: string): Storage | undefined {
        return this.findBestMatch(this.repository.getStorage(), name);
    }

    private findBestMatch<T extends { name: string; brand?: string }>(
        parts: T[],
        detectedName: string,
    ): T | undefined {
        const normalizedDetectedName = this.normalize(detectedName);
        if (!normalizedDetectedName) return undefined;

        const candidates = parts
            .map<MatchCandidate<T>>(part => ({
                part,
                score: this.score(part, normalizedDetectedName),
            }))
            .filter(candidate => candidate.score >= 0.45)
            .sort((a, b) => b.score - a.score);

        return candidates[0]?.part;
    }

    private score<T extends { name: string; brand?: string }>(
        part: T,
        normalizedDetectedName: string,
    ): number {
        const normalizedDatabaseName = this.normalize(part.name);
        const normalizedBrand = this.normalize(part.brand ?? '');

        if (!normalizedDatabaseName) return 0;

        if (normalizedDatabaseName === normalizedDetectedName) return 1;

        if (normalizedDatabaseName.includes(normalizedDetectedName)) return 0.95;
        if (normalizedDetectedName.includes(normalizedDatabaseName)) return 0.9;

        const detectedTokens = this.tokenize(normalizedDetectedName);
        const databaseTokens = this.tokenize(normalizedDatabaseName);

        if (detectedTokens.length === 0 || databaseTokens.length === 0) return 0;

        const commonTokens = detectedTokens.filter(token => databaseTokens.includes(token));
        const tokenScore = commonTokens.length / detectedTokens.length;

        const modelBonus = this.getModelBonus(detectedTokens, databaseTokens);
        const brandBonus = normalizedBrand && detectedTokens.includes(normalizedBrand) ? 0.08 : 0;

        return Math.min(tokenScore + modelBonus + brandBonus, 1);
    }

    private getModelBonus(detectedTokens: string[], databaseTokens: string[]): number {
        const detectedModelTokens = detectedTokens.filter(token => /^(i[3579]|r[3579]|ryzen|core|rtx|gtx|rx|arc)?\d{3,5}[a-z]*$/i.test(token));
        if (detectedModelTokens.length === 0) return 0;

        const matchedModelTokens = detectedModelTokens.filter(token => databaseTokens.includes(token));
        return matchedModelTokens.length / detectedModelTokens.length * 0.2;
    }

    private tokenize(value: string): string[] {
        return value
            .split(' ')
            .filter(token => token.length > 1)
            .filter(token => !['amd', 'intel', 'nvidia', 'geforce', 'radeon', 'graphics', 'processor', 'cpu', 'gpu'].includes(token));
    }

    private normalize(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\(r\)|\(tm\)|®|™/g, '')
            .replace(/\bprocessor\b|\bcpu\b|\bgpu\b|\bgraphics\b/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
