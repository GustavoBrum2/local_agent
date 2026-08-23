import type { Build } from '@/domain/entities/build';
import type { DetectedHardware, DetectionSource } from '@/adapters/hardware-detector';

export interface HardwareSnapshot {
  id: string;
  capturedAt: string;
  source: DetectionSource;
  build: Build;
  detected: DetectedHardware;
}

export interface LocalDigitalTwin {
  machineId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  current: HardwareSnapshot;
  history: HardwareSnapshot[];
  upgrades: LocalUpgradeEvent[];
}

/**
 * Reservado para a evolução pós-MVP.
 * Nesta primeira base o evento pode ser registrado manualmente,
 * mas não existe ainda aprendizado coletivo ou Cloud.
 */
export interface LocalUpgradeEvent {
  id: string;
  createdAt: string;
  description: string;
  beforeSnapshotId?: string;
  afterSnapshotId?: string;
}
