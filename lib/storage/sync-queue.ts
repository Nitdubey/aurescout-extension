/**
 * Offline sync queue — buffers API actions when offline and flushes on reconnect.
 */

import { STORAGE_KEYS } from '@/lib/constants';

export type QueueActionType =
  | 'SAVE_JOB'
  | 'UPDATE_APPLICATION'
  | 'SYNC_PROFILE';

export interface QueueAction {
  id: string;
  type: QueueActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getQueue(): Promise<QueueAction[]> {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.SYNC_QUEUE], result => {
      resolve((result[STORAGE_KEYS.SYNC_QUEUE] as QueueAction[] | undefined) ?? []);
    });
  });
}

async function setQueue(queue: QueueAction[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.SYNC_QUEUE]: queue }, resolve);
  });
}

/**
 * Add an action to the sync queue.
 */
export async function enqueue(
  type: QueueActionType,
  payload: Record<string, unknown>
): Promise<void> {
  const queue = await getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Drop oldest items to make room
    queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1);
  }
  queue.push({ id: generateId(), type, payload, createdAt: Date.now(), retries: 0 });
  await setQueue(queue);
}

/**
 * Flush the queue — process all pending actions.
 * Pass a handler function that attempts each action; return true on success.
 */
export async function flushQueue(
  handler: (action: QueueAction) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueueAction[] = [];

  for (const action of queue) {
    try {
      const success = await handler(action);
      if (success) {
        processed++;
      } else {
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          remaining.push(action);
        } else {
          failed++;
        }
      }
    } catch {
      action.retries++;
      if (action.retries < MAX_RETRIES) {
        remaining.push(action);
      } else {
        failed++;
      }
    }
  }

  await setQueue(remaining);
  return { processed, failed };
}

/**
 * Get current queue length (for UI display).
 */
export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Clear the entire sync queue.
 */
export async function clearQueue(): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEYS.SYNC_QUEUE, resolve);
  });
}
