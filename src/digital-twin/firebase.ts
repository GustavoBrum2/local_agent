import type { LocalDigitalTwin, RemoteDigitalTwin } from './types';

const FIREBASE_RTDB_URL = 'https://twinmatch-659d6-default-rtdb.firebaseio.com';
const TWINS_PATH = 'twins';

function twinUrl(machineId: string): string {
  return `${FIREBASE_RTDB_URL}/${TWINS_PATH}/${encodeURIComponent(machineId)}.json`;
}

export function toRemoteDigitalTwin(twin: LocalDigitalTwin): RemoteDigitalTwin {
  return {
    machineId: twin.machineId,
    name: twin.name,
    createdAt: twin.createdAt,
    updatedAt: twin.updatedAt,
    current: twin.current,
  };
}

async function assertOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;

  const detail = (await response.text().catch(() => '')).trim();
  throw new Error(
    `Falha ao ${action} no Firebase (${response.status})${detail ? `: ${detail}` : ''}`,
  );
}

function rethrowAsFirebaseError(error: unknown, action: string): never {
  if (error instanceof Error && error.message.startsWith('Falha ao')) {
    throw error;
  }

  throw new Error(
    `Falha ao ${action} no Firebase: ${error instanceof Error ? error.message : String(error)}`,
  );
}

export async function upsertRemoteTwin(twin: LocalDigitalTwin): Promise<void> {
  try {
    const response = await fetch(twinUrl(twin.machineId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRemoteDigitalTwin(twin)),
    });
    await assertOk(response, 'enviar o Digital Twin');
  } catch (error) {
    rethrowAsFirebaseError(error, 'enviar o Digital Twin');
  }
}

export async function deleteRemoteTwin(machineId: string): Promise<void> {
  try {
    const response = await fetch(twinUrl(machineId), { method: 'DELETE' });
    await assertOk(response, 'remover o Digital Twin');
  } catch (error) {
    rethrowAsFirebaseError(error, 'remover o Digital Twin');
  }
}
