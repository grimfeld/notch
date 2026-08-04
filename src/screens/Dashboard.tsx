import { useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { useAllEntries, useStats } from "@/lib/hooks";
import type { Entry } from "@/lib/types";

export function Dashboard() {
  const stats = useStats();
  const entries = useAllEntries();

  const byStat = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries.data ?? []) {
      const list = map.get(e.stat);
      if (list) list.push(e);
      else map.set(e.stat, [e]);
    }
    return map;
  }, [entries.data]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Notch</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/new">
            <Plus /> New stat
          </Link>
        </Button>
      </header>

      {stats.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : stats.isError ? (
        <p className="text-sm text-destructive">
          Could not reach the server. Cached data may be stale; logging still
          works and will sync later.
        </p>
      ) : (stats.data?.length ?? 0) === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p className="mb-4">No stats yet. Carve your first notch.</p>
          <Button asChild>
            <Link to="/new">
              <Plus /> Create a stat
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.data!.map((stat) => (
            <StatCard
              key={stat.id}
              stat={stat}
              entries={byStat.get(stat.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
