import { load, type Store } from "@tauri-apps/plugin-store";
import { getPb, isNetworkError } from "./pb";

/**
 * Append-only offline queue (see docs/adr/0001). Entries logged while
 * offline wait here and are flushed as plain creates on reconnect.
 * Corrections (edit/delete) never enter the queue.
 */
export interface QueuedEntry {
  localId: string;
  stat: string;
  value: number;
  ts: string;
}

const STORE_FILE = "queue.json";
const KEY = "pending";

let store: Store | null = null;
let items: QueuedEntry[] = [];
const listeners = new Set<() => void>();
let flushing = false;

function notify() {
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): QueuedEntry[] {
  return items;
}

async function persist() {
  if (!store) return;
  await store.set(KEY, items);
  await store.save();
}

export async function initQueue(): Promise<void> {
  store = await load(STORE_FILE, { autoSave: false });
  items = (await store.get<QueuedEntry[]>(KEY)) ?? [];
  notify();
}

export async function enqueue(e: Omit<QueuedEntry, "localId">): Promise<void> {
  items = [...items, { ...e, localId: crypto.randomUUID() }];
  await persist();
  notify();
}

/**
 * Push queued entries to the backend. Stops at the first network failure
 * (still offline); other errors drop the bad entry rather than wedging the
 * queue. Returns the number of entries successfully pushed.
 */
export async function flushQueue(): Promise<number> {
  const pb = getPb();
  if (flushing || !pb.authStore.isValid || items.length === 0) return 0;
  flushing = true;
  let pushed = 0;
  try {
    while (items.length > 0) {
      const head = items[0];
      try {
        await pb.collection("entries").create(
          { stat: head.stat, value: head.value, ts: head.ts },
          { requestKey: null },
        );
        pushed++;
      } catch (err) {
        if (isNetworkError(err)) break;
        console.error("dropping unpushable queued entry", head, err);
      }
      items = items.slice(1);
      await persist();
      notify();
    }
  } finally {
    flushing = false;
  }
  if (pushed > 0) {
    window.dispatchEvent(new CustomEvent("notch:queue-flushed"));
  }
  return pushed;
}
