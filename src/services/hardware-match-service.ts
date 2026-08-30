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

const STOP_WORDS = new Set([
    'amd',
    'intel',
    'nvidia',
    'geforce',
    'radeon',
    'graphics',
    'processor',
    'cpu',
    'gpu',
    'core',
    'cores',
    'oem',
    'tray',
    'laptop',
    'mobile',
    'desktop',
    'ghz',
    'mhz',
]);

const FAMILY_PREFIX = /^(i[3579]|r[3579]|rtx|gtx|rx|arc)$/;
const MODEL_NUMBER = /^(a)?\d{3,5}[a-z]*$/;
const MODEL_SUFFIX = /^(super|ti|xt|xtx|x3d)$/;
const MODEL_TOKEN = /^(i[3579]|r[3579]|ryzen[3579]?|rtx|gtx|rx|arc)(a)?\d{3,5}[a-z]*$/;

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
        const detectedTokens = this.normalize(detectedName);
        if (detectedTokens.length === 0) return undefined;

        const candidates = parts
            .map<MatchCandidate<T>>(part => ({
                part,
                score: this.score(part, detectedName, detectedTokens),
            }))
            .filter(candidate => candidate.score >= 0.45)
            .sort((a, b) => b.score - a.score);

        return candidates[0]?.part;
    }

    private score<T extends { name: string; brand?: string }>(
        part: T,
        detectedName: string,
        detectedTokens: string[],
    ): number {
        const databaseTokens = this.normalize(part.name);
        if (databaseTokens.length === 0) return 0;

        if (this.sameTokens(detectedTokens, databaseTokens)) return 1;

        const tokenScore = this.compareTokens(detectedTokens, databaseTokens);
        if (tokenScore === 0) return 0;

        const brand = this.clean(part.brand ?? '');
        const brandBonus = brand && this.clean(detectedName).includes(brand) ? 0.08 : 0;

        return Math.min(tokenScore + brandBonus, 1);
    }

    /**
     * Compares each detected token against the database token list.
     * Model tokens (e.g. i510210u vs i56500) must match; a shared
     * family like "i5" is not enough to accept a different generation.
     */
    private compareTokens(detectedTokens: string[], databaseTokens: string[]): number {
        const databaseSet = new Set(databaseTokens);
        const detectedModels = detectedTokens.filter(token => MODEL_TOKEN.test(token));
        const databaseModels = databaseTokens.filter(token => MODEL_TOKEN.test(token));

        if (detectedModels.length > 0 && databaseModels.length > 0) {
            const hasMatchingModel = detectedModels.some(model => databaseModels.includes(model));
            if (!hasMatchingModel) return 0;
        }

        const matchedCount = detectedTokens.filter(token => databaseSet.has(token)).length;
        if (matchedCount === 0) return 0;

        return matchedCount / detectedTokens.length;
    }

    private sameTokens(left: string[], right: string[]): boolean {
        if (left.length !== right.length) return false;
        const rightSet = new Set(right);
        return left.every(token => rightSet.has(token));
    }

    private normalize(value: string): string[] {
        const cleaned = this.clean(value);
        if (!cleaned) return [];

        const rawTokens = cleaned
            .split(' ')
            .filter(token => token.length > 1);

        return this.mergeModelTokens(rawTokens)
            .filter(token => !STOP_WORDS.has(token))
            .filter(token => !/^(lga|am|fm)\d+$/.test(token));
    }

    private mergeModelTokens(tokens: string[]): string[] {
        const merged: string[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const next = tokens[i + 1];
            const after = tokens[i + 2];

            if (token === 'ryzen' && next && /^[3579]$/.test(next) && after && MODEL_NUMBER.test(after)) {
                let model = `ryzen${next}${after}`;
                let lastIndex = i + 2;
                const suffix = tokens[i + 3];
                if (suffix && MODEL_SUFFIX.test(suffix)) {
                    model += suffix;
                    lastIndex = i + 3;
                }
                merged.push(model);
                i = lastIndex;
                continue;
            }

            if (next && FAMILY_PREFIX.test(token) && MODEL_NUMBER.test(next)) {
                let model = token + next;
                let lastIndex = i + 1;
                const suffix = tokens[i + 2];
                if (suffix && MODEL_SUFFIX.test(suffix)) {
                    model += suffix;
                    lastIndex = i + 2;
                }
                merged.push(model);
                i = lastIndex;
                continue;
            }

            merged.push(token);
        }

        return merged;
    }

    private clean(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\(r\)|\(tm\)|®|™/g, ' ')
            .replace(/@\s*[\d.,]+\s*(ghz|mhz)?/g, ' ')
            .replace(/\b[\d.,]+\s*(ghz|mhz)\b/g, ' ')
            .replace(/\bprocessor\b|\bcpu\b|\bgpu\b|\bgraphics\b/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
