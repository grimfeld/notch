import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { AdditiveChart, MeasurementChart } from "@/components/StatChart";
import {
  dailySeries,
  formatValue,
  headline,
  readingSeries,
} from "@/lib/aggregate";
import {
  useDeleteEntry,
  useEntries,
  usePendingEntries,
  useStat,
} from "@/lib/hooks";
import type { Period } from "@/lib/types";

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

  const daily = useMemo(
    () =>
      stat.data?.kind === "additive"
        ? dailySeries(entries.data ?? [], period)
        : [],
    [stat.data?.kind, entries.data, period],
  );
  const readings = useMemo(
    () =>
      stat.data?.kind === "measurement"
        ? readingSeries(entries.data ?? [], period)
        : [],
    [stat.data?.kind, entries.data, period],
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
  const total = headline(s, entries.data ?? [], pending, period);
  const myPending = pending.filter((q) => q.stat === s.id).length;

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
          <Plus /> Log
        </Button>
      </header>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-semibold">
            {total === null ? "—" : formatValue(total)}
            {s.unit ? (
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {s.unit}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {s.kind === "additive" ? "total in period" : "latest reading"}
            {myPending > 0 ? ` · ${myPending} pending sync` : ""}
          </div>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
          ) : readings.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No readings in this period.
            </p>
          ) : (
            <MeasurementChart data={readings} color={s.color} unit={s.unit} />
          )}
        </CardContent>
      </Card>

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
                  {formatValue(e.value)}
                  {s.unit ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      {s.unit}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {new Date(e.ts).toLocaleString(undefined, {
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

      <AddEntryDialog stat={s} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
