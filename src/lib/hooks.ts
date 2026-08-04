import { useEffect, useSyncExternalStore } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPb, isNetworkError } from "./pb";
import {
  enqueue,
  flushQueue,
  getSnapshot,
  subscribe,
  type QueuedEntry,
} from "./queue";
import type { Entry, Stat } from "./types";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () =>
      getPb().collection("stats").getFullList<Stat>({ sort: "created" }),
  });
}

export function useStat(id: string | undefined) {
  return useQuery({
    queryKey: ["stats", id],
    enabled: !!id,
    queryFn: () => getPb().collection("stats").getOne<Stat>(id!),
  });
}

/** All entries for one stat, newest first. */
export function useEntries(statId: string | undefined) {
  return useQuery({
    queryKey: ["entries", statId],
    enabled: !!statId,
    queryFn: () =>
      getPb()
        .collection("entries")
        .getFullList<Entry>({
          filter: getPb().filter("stat = {:statId}", { statId }),
          sort: "-ts",
        }),
  });
}

/**
 * All entries for every stat — feeds dashboard headlines + sparklines.
 * All-time because Collection distinct counts and Boolean streaks reach
 * arbitrarily far back; personal-scale data keeps this cheap.
 */
export function useAllEntries() {
  return useQuery({
    queryKey: ["entries", "all"],
    queryFn: () =>
      getPb().collection("entries").getFullList<Entry>({ sort: "-ts" }),
  });
}

/** Pending offline-queued entries (live view). */
export function usePendingEntries(): QueuedEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export interface NewEntry {
  stat: string;
  value: number;
  /** Collection only: name of the item collected. */
  item?: string;
  ts: string;
}

/**
 * Log an entry. Network failure -> offline queue (append-only), anything
 * else surfaces as an error. Resolves with where it landed.
 */
export function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewEntry): Promise<"server" | "queued"> => {
      const pb = getPb();
      if (!pb.authStore.isValid) {
        await enqueue(entry);
        return "queued";
      }
      try {
        await pb.collection("entries").create(entry, { requestKey: null });
        return "server";
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueue(entry);
          return "queued";
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      getPb().collection("entries").delete(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

export function useSaveStat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; data: Partial<Stat> }) => {
      const pb = getPb();
      return input.id
        ? pb.collection("stats").update<Stat>(input.id, input.data)
        : pb.collection("stats").create<Stat>(input.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });
}

export function useDeleteStat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getPb().collection("stats").delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stats"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

/**
 * Flush the offline queue on mount, on reconnect, and every 30s while
 * anything is pending; refresh entry queries after a successful flush.
 */
export function useQueueFlusher() {
  const qc = useQueryClient();
  const pending = usePendingEntries();

  useEffect(() => {
    const onFlushed = () => qc.invalidateQueries({ queryKey: ["entries"] });
    window.addEventListener("notch:queue-flushed", onFlushed);
    return () => window.removeEventListener("notch:queue-flushed", onFlushed);
  }, [qc]);

  useEffect(() => {
    if (pending.length === 0) return;
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => void flushQueue(), 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [pending.length]);
}
