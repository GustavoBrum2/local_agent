import { analyzeCompatibility } from '@/domain/rules/engine';
import { PartsRepository } from '@/parts-repository';
import type { Build } from '@/domain/entities/build';
import type { Part } from '@/domain/entities/parts';
import type { CompatibilityResult } from '@/domain/entities/compatibility';

export type MvpRecommendationCategory = 'ram' | 'ssd' | 'gpu';

export interface MvpRecommendation {
  part: Part;
  result: CompatibilityResult;
  score: number;
}

/**
 * Versão desktop enxuta do LocalHardwareRecommendationService da extensão.
 * Mantém o princípio existente: catálogo -> engine -> filtra compatíveis -> ordena.
 * O Ollama foi deixado fora desta base porque não é necessário para provar o MVP.
 */
export class MvpRecommendationService {
  private readonly repository = new PartsRepository();

  recommend(build: Build, category: MvpRecommendationCategory, limit = 5): MvpRecommendation[] {
    return this.parts(category)
      .map((part) => {
        const result = analyzeCompatibility(build, part);
        return { part, result, score: this.score(part, result) };
      })
      .filter(({ result }) =>
        result.status === 'compatible' || result.status === 'compatible_with_warnings',
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private parts(category: MvpRecommendationCategory): Part[] {
    if (category === 'ram') return this.repository.getRam() as unknown as Part[];
    if (category === 'ssd') return this.repository.getSsds() as unknown as Part[];
    return this.repository.getGpus() as unknown as Part[];
  }

  private score(part: Part, result: CompatibilityResult): number {
    let score = result.status === 'compatible' ? 100 : 70;
    score += result.reasons.length * 3;
    score -= result.warnings.length * 8;
    score -= result.blockers.length * 50;

    if (part.category === 'ram') score += Math.min(part.capacityGb, 64) / 2;
    if (part.category === 'ssd') {
      score += Math.min(part.capacityGb, 4096) / 256;
      if (part.interface.toLowerCase().includes('nvme')) score += 8;
    }

    return score;
  }
}
