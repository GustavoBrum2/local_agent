export type {
  DetectedHardware,
  DetectedCpu,
  DetectedGpu,
  DetectedRam,
  DetectedStorage,
  DetectedMotherboard,
  DetectedSystem,
  DetectionSource,
  DetectionConfidence,
  NativeHardwareData,
} from './types';

export { detectHardwareDesktop } from './tauri-detector';
