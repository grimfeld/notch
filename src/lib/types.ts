export const STAT_KINDS = ["additive", "measurement"] as const;
export type StatKind = (typeof STAT_KINDS)[number];

export const COLOR_SLOTS = [
  "blue",
  "orange",
  "aqua",
  "yellow",
  "magenta",
  "green",
  "violet",
  "red",
] as const;
export type ColorSlot = (typeof COLOR_SLOTS)[number];

export function colorVar(slot: string): string {
  return `var(--chart-${slot})`;
}

export interface Stat {
  id: string;
  name: string;
  kind: StatKind;
  unit: string;
  color: ColorSlot;
  defaultIncrement: number;
  created: string;
  updated: string;
}

export interface Entry {
  id: string;
  stat: string;
  value: number;
  /** Moment the event happened (user-settable), not the record creation time. */
  ts: string;
  created: string;
}

export type Period = "week" | "month" | "year" | "all";
