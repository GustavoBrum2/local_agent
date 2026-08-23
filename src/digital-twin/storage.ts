import { invoke } from '@tauri-apps/api/core';
import type { LocalDigitalTwin } from './types';

export async function saveDigitalTwin(twin: LocalDigitalTwin): Promise<void> {
  await invoke('save_digital_twin', { json: JSON.stringify(twin, null, 2) });
}

export async function loadDigitalTwin(): Promise<LocalDigitalTwin | null> {
  const json = await invoke<string | null>('load_digital_twin');
  return json ? (JSON.parse(json) as LocalDigitalTwin) : null;
}

export async function deleteDigitalTwin(): Promise<void> {
  await invoke('delete_digital_twin');
}
