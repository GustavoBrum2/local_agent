interface GpuIdentity {
  name: string;
  brand?: string;
  vendor?: string;
  vramGb?: number;
}

const INTEGRATED_PATTERNS = [
  /\bintegrated\b/i,
  /\bprocessor graphics\b/i,
  /\bamd radeon\(tm\) graphics\b/i,
  /\bamd radeon graphics\b/i,
  /\bradeon vega \d+ graphics\b/i,
  /\bintel(?:\(r\))? (?:uhd|hd|iris) graphics\b/i,
];

const DISCRETE_PATTERNS = [
  /\bnvidia\b.*\b(?:rtx|gtx|quadro|tesla)\b/i,
  /\bgeforce\b/i,
  /\bradeon\b.*\brx\s?\d+/i,
  /\bradeon pro\b/i,
  /\bintel(?:\(r\))? arc\b/i,
];

export function isIntegratedGpu(gpu: GpuIdentity): boolean {
  const identity = `${gpu.brand ?? gpu.vendor ?? ''} ${gpu.name}`.trim();
  return INTEGRATED_PATTERNS.some(pattern => pattern.test(identity));
}

export function gpuPriority(gpu: GpuIdentity): number {
  const identity = `${gpu.brand ?? gpu.vendor ?? ''} ${gpu.name}`.trim();
  if (isIntegratedGpu(gpu)) return 0;
  if (DISCRETE_PATTERNS.some(pattern => pattern.test(identity))) return 100;
  if ((gpu.vramGb ?? 0) >= 4) return 80;
  return 50;
}

export function sortGpusByPriority<T extends GpuIdentity>(gpus: T[]): T[] {
  return [...gpus].sort((a, b) => gpuPriority(b) - gpuPriority(a));
}

export function getPrimaryGpu<T extends GpuIdentity>(gpus: T[]): T | undefined {
  return sortGpusByPriority(gpus)[0];
}
