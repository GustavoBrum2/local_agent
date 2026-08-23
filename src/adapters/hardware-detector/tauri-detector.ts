import { invoke } from '@tauri-apps/api/core';
import type { DetectedHardware, NativeHardwareData } from './types';
import { nativeDataToDetected } from './native-to-detected';

/**
 * Substitui o Chrome Native Messaging da extensão.
 * O frontend chama um comando Tauri; o Rust executa o coletor PowerShell
 * e retorna o mesmo contrato NativeHardwareData já utilizado pela extensão.
 */
export async function detectHardwareDesktop(): Promise<DetectedHardware> {
  const nativeData = await invoke<NativeHardwareData>('detect_hardware');
  return nativeDataToDetected(nativeData);
}
