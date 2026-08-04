import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteStat, useSaveStat, useStat } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  COLOR_SLOTS,
  STAT_KINDS,
  colorVar,
  type ColorSlot,
  type StatKind,
} from "@/lib/types";

const KIND_LABELS: Record<StatKind, { title: string; hint: string }> = {
  additive: { title: "Additive", hint: "Increments that add up — push-ups, books" },
  measurement: { title: "Measurement", hint: "Point-in-time readings — weight" },
  boolean: { title: "Boolean", hint: "Did it happen today — workouts, habits" },
  collection: { title: "Collection", hint: "Distinct things collected — countries" },
};

export function StatEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const existing = useStat(id);
  const saveStat = useSaveStat();
  const deleteStat = useDeleteStat();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<StatKind>("additive");
  const [unit, setUnit] = useState("");
  const [color, setColor] = useState<ColorSlot>("blue");
  const [increment, setIncrement] = useState("1");
  const [universe, setUniverse] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setName(existing.data.name);
      setKind(existing.data.kind);
      setUnit(existing.data.unit);
      setColor(existing.data.color);
      setIncrement(`${existing.data.defaultIncrement || ""}`);
      setUniverse(`${existing.data.universeSize || ""}`);
    }
  }, [existing.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const saved = await saveStat.mutateAsync({
      id,
      data: {
        name: name.trim(),
        kind,
        unit: kind === "additive" || kind === "measurement" ? unit.trim() : "",
        color,
        defaultIncrement:
          kind === "additive" ? Number(increment) || 0 : 0,
        universeSize: kind === "collection" ? Number(universe) || 0 : 0,
      },
    });
    navigate(isNew ? `/stat/${saved.id}` : `/stat/${id}`);
  }

  async function remove() {
    if (!id) return;
    await deleteStat.mutateAsync(id);
    navigate("/");
  }

  if (!isNew && existing.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link to={isNew ? "/" : `/stat/${id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          {isNew ? "New stat" : "Edit stat"}
        </h1>
      </header>

      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="stat-name">Name</Label>
          <Input
            id="stat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push-ups"
            required
            autoFocus={isNew}
          />
        </div>

        <div className="grid gap-2">
          <Label>Kind</Label>
          <div className="grid grid-cols-2 gap-2">
            {STAT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                disabled={!isNew}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  kind === k
                    ? "border-primary ring-2 ring-ring/50"
                    : "hover:bg-accent",
                  !isNew && "opacity-50 hover:bg-transparent",
                )}
              >
                <div className="text-sm font-medium">{KIND_LABELS[k].title}</div>
                <div className="text-xs text-muted-foreground">
                  {KIND_LABELS[k].hint}
                </div>
              </button>
            ))}
          </div>
          {!isNew ? (
            <p className="text-xs text-muted-foreground">
              Kind is fixed after creation — entries would mean something else.
            </p>
          ) : null}
        </div>

        {kind === "additive" || kind === "measurement" ? (
          <div className="grid gap-2">
            <Label htmlFor="stat-unit">Unit (optional)</Label>
            <Input
              id="stat-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={kind === "additive" ? "reps" : "kg"}
            />
          </div>
        ) : null}

        {kind === "collection" ? (
          <div className="grid gap-2">
            <Label htmlFor="stat-universe">Out of (optional)</Label>
            <Input
              id="stat-universe"
              type="number"
              min="1"
              inputMode="numeric"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              placeholder="195"
            />
            <p className="text-xs text-muted-foreground">
              How many exist in total — shown as “5 / 195”.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-label={slot}
                aria-pressed={color === slot}
                onClick={() => setColor(slot)}
                className={cn(
                  "size-8 rounded-md border transition-transform",
                  color === slot && "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110",
                )}
                style={{ background: colorVar(slot) }}
              />
            ))}
          </div>
        </div>

        {kind === "additive" ? (
          <div className="grid gap-2">
            <Label htmlFor="stat-increment">Quick-add amount</Label>
            <Input
              id="stat-increment"
              type="number"
              step="any"
              inputMode="decimal"
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The + button on the dashboard logs this amount in one tap.
            </p>
          </div>
        ) : null}

        {saveStat.isError ? (
          <p className="text-sm text-destructive">
            Save failed — stat changes need a connection.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saveStat.isPending} className="flex-1">
            {isNew ? "Create" : "Save"}
          </Button>
          {!isNew ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </form>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{name}”?</DialogTitle>
            <DialogDescription>
              Every logged entry for this stat is deleted with it. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteStat.isPending}
              onClick={remove}
            >
              Delete stat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
