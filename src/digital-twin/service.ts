import type { Build } from '@/domain/entities/build';
import type { DetectedHardware } from '@/adapters/hardware-detector';
import type { HardwareSnapshot, LocalDigitalTwin } from './types';

const MAX_LOCAL_HISTORY = 25;

function createSnapshot(build: Build, detected: DetectedHardware): HardwareSnapshot {
  return {
    id: crypto.randomUUID(),
    capturedAt: detected.detectedAt,
    source: detected.source,
    build,
    detected,
  };
}

function machineDisplayName(detected: DetectedHardware): string {
  const manufacturer = detected.system?.manufacturer?.trim();
  const model = detected.system?.model?.trim();
  return [manufacturer, model].filter(Boolean).join(' ') || 'Meu computador';
}

export function createOrUpdateDigitalTwin(
  existing: LocalDigitalTwin | null,
  build: Build,
  detected: DetectedHardware,
): LocalDigitalTwin {
  const now = new Date().toISOString();
  const current = createSnapshot(build, detected);

  if (!existing) {
    return {
      machineId: crypto.randomUUID(),
      name: machineDisplayName(detected),
      createdAt: now,
      updatedAt: now,
      current,
      history: [],
      upgrades: [],
    };
  }

  return {
    ...existing,
    name: machineDisplayName(detected) || existing.name,
    updatedAt: now,
    current,
    history: [existing.current, ...existing.history].slice(0, MAX_LOCAL_HISTORY),
  };
}
