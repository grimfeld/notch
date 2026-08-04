import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { DotGrid } from "@/components/DotGrid";
import {
  AdditiveChart,
  CollectionChart,
  MeasurementChart,
} from "@/components/StatChart";
import {
  booleanHeadline,
  collectedItems,
  collectionSeries,
  currentStreak,
  dailySeries,
  formatValue,
  headline,
  longestStreak,
  markedDays,
  mergedFacts,
  periodStart,
  readingSeries,
} from "@/lib/aggregate";
import {
  useDeleteEntry,
  useEntries,
  usePendingEntries,
  useStat,
} from "@/lib/hooks";
import { colorVar, type Period } from "@/lib/types";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "7d" },
  { value: "month", label: "30d" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export function StatDetail() {
  const { id } = useParams<{ id: string }>();
  const stat = useStat(id);
  const entries = useEntries(id);
  const pending = usePendingEntries();
  const deleteEntry = useDeleteEntry();
  const [period, setPeriod] = useState<Period>("month");
  const [cumulative, setCumulative] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const kind = stat.data?.kind;
  const daily = useMemo(
    () => (kind === "additive" ? dailySeries(entries.data ?? [], period) : []),
    [kind, entries.data, period],
  );
  const readings = useMemo(
    () =>
      kind === "measurement" ? readingSeries(entries.data ?? [], period) : [],
    [kind, entries.data, period],
  );
  const facts = useMemo(
    () =>
      stat.data ? mergedFacts(stat.data, entries.data ?? [], pending) : [],
    [stat.data, entries.data, pending],
  );
  const days = useMemo(
    () => (kind === "boolean" ? markedDays(facts) : new Set<string>()),
    [kind, facts],
  );
  const items = useMemo(
    () => (kind === "collection" ? collectedItems(facts) : []),
    [kind, facts],
  );

  if (stat.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!stat.data) {
    return (
      <div className="p-4">
        <p className="text-sm text-destructive">Stat not found.</p>
        <Button asChild variant="link">
          <Link to="/">Back</Link>
        </Button>
      </div>
    );
  }
  const s = stat.data;
  const myPending = pending.filter((q) => q.stat === s.id).length;

  let big: string;
  let caption: string;
  if (s.kind === "boolean") {
    const h = booleanHeadline(days, period);
    big = h.denominator === null ? `${h.count}` : `${h.count} / ${h.denominator}`;
    caption = h.denominator === null ? "days marked" : "days marked in period";
  } else if (s.kind === "collection") {
    big = s.universeSize
      ? `${items.length} / ${formatValue(s.universeSize)}`
      : `${items.length}`;
    caption = "items collected";
  } else {
    const total = headline(s, entries.data ?? [], pending, period);
    big = total === null ? "—" : formatValue(total);
    caption = s.kind === "additive" ? "total in period" : "latest reading";
  }

  const gridStart = (() => {
    if (s.kind !== "boolean") return null;
    const fromPeriod = periodStart(period);
    if (fromPeriod !== null) return fromPeriod;
    const keys = [...days].sort();
    if (keys.length === 0) return null;
    const [y, m, d] = keys[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  })();

  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {s.name}
        </h1>
        <Button asChild variant="ghost" size="icon" aria-label="Edit stat">
          <Link to={`/stat/${s.id}/edit`}>
            <Pencil />
          </Link>
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus /> {s.kind === "boolean" ? "Mark" : "Log"}
        </Button>
      </header>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold">
            {big}
            {(s.kind === "additive" || s.kind === "measurement") && s.unit ? (
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {s.unit}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {caption}
            {myPending > 0 ? ` · ${myPending} pending sync` : ""}
          </div>
          {s.kind === "boolean" ? (
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="size-4" style={{ color: colorVar(s.color) }} />
                {currentStreak(days)} day streak
              </span>
              <span>best {longestStreak(days)}</span>
            </div>
          ) : null}
        </div>
        {s.kind !== "collection" ? (
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-2">
          {s.kind === "additive" ? (
            <>
              <div className="mb-2 flex justify-end">
                <Tabs
                  value={cumulative ? "cumulative" : "daily"}
                  onValueChange={(v) => setCumulative(v === "cumulative")}
                >
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {daily.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No entries in this period.
                </p>
              ) : (
                <AdditiveChart
                  data={daily}
                  color={s.color}
                  unit={s.unit}
                  cumulative={cumulative}
                />
              )}
            </>
          ) : s.kind === "measurement" ? (
            readings.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No readings in this period.
              </p>
            ) : (
              <MeasurementChart data={readings} color={s.color} unit={s.unit} />
            )
          ) : s.kind === "boolean" ? (
            gridStart === null ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No days marked yet.
              </p>
            ) : (
              <DotGrid
                days={days}
                start={gridStart}
                end={new Date()}
                color={s.color}
              />
            )
          ) : items.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "Nothing collected yet."
                : "One item collected — the graph starts at two."}
            </p>
          ) : (
            <CollectionChart data={collectionSeries(items)} color={s.color} />
          )}
        </CardContent>
      </Card>

      {s.kind === "collection" ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Collected
          </h2>
          <ul className="divide-y rounded-lg border">
            {items.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">Nothing yet.</li>
            ) : (
              [...items].reverse().map((it) => (
                <li
                  key={it.name}
                  className="flex items-center justify-between gap-2 p-3 text-sm"
                >
                  <span className="font-medium">{it.name}</span>
                  <span className="text-muted-foreground">
                    {new Date(it.firstTs).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Entries
        </h2>
        <ul className="divide-y rounded-lg border">
          {(entries.data ?? []).length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Nothing yet.</li>
          ) : (
            (entries.data ?? []).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-medium tabular-nums">
                  {s.kind === "boolean" ? (
                    <Check className="size-4" style={{ color: colorVar(s.color) }} />
                  ) : s.kind === "collection" ? (
                    e.item || "—"
                  ) : (
                    <>
                      {formatValue(e.value)}
                      {s.unit ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          {s.unit}
                        </span>
                      ) : null}
                    </>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {s.kind === "boolean"
                    ? new Date(e.ts).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : new Date(e.ts).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete entry"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={deleteEntry.isPending}
                  onClick={() => deleteEntry.mutate(e.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))
          )}
        </ul>
        {deleteEntry.isError ? (
          <p className="mt-2 text-sm text-destructive">
            Delete failed — corrections need a connection.
          </p>
        ) : null}
      </section>

      <AddEntryDialog
        stat={s}
        open={addOpen}
        onOpenChange={setAddOpen}
        itemSuggestions={items.map((i) => i.name)}
      />
    </div>
  );
}
