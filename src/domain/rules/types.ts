import type { Build } from '../entities/build';
import type { Part } from '../entities/parts';
import type { CompatibilityResult } from '../entities/compatibility';

export type CompatibilityRule = (build: Build, part: Part) => CompatibilityResult | null;
