import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint, ReadingPoint } from "@/lib/aggregate";
import { formatValue } from "@/lib/aggregate";
import { colorVar } from "@/lib/types";

const AXIS_TICK = { fill: "var(--chart-muted)", fontSize: 11 } as const;
const GRID = { stroke: "var(--chart-grid)", vertical: false } as const;

interface TooltipRowProps {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{ value?: unknown }>;
  color: string;
  unit: string;
  heading?: string;
}

/** Hover layer: surface-styled card, ink-colored text, color chip for identity. */
function ChartTooltip({ active, label, payload, color, unit, heading }: TooltipRowProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground">{heading ?? String(label ?? "")}</div>
      <div className="mt-0.5 flex items-center gap-1.5 font-medium text-popover-foreground">
        <span
          className="size-2 shrink-0 rounded-[2px]"
          style={{ background: color }}
        />
        {typeof value === "number" ? formatValue(value) : String(value ?? "")}
        {unit ? <span className="text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  );
}

interface AdditiveChartProps {
  data: DayPoint[];
  color: string; // color slot name
  unit: string;
  cumulative: boolean;
}

export function AdditiveChart({ data, color, unit, cumulative }: AdditiveChartProps) {
  const stroke = colorVar(color);
  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);
  if (cumulative) {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-baseline)" }}
            interval={interval}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            cursor={{ stroke: "var(--chart-baseline)", strokeWidth: 1 }}
            content={(p) => <ChartTooltip {...p} color={stroke} unit={unit} />}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          interval={interval}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
          content={(p) => <ChartTooltip {...p} color={stroke} unit={unit} />}
        />
        <Bar dataKey="sum" fill={stroke} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CollectionChartProps {
  /** Cumulative distinct-item count, one point per new item. */
  data: ReadingPoint[];
  color: string;
}

/** All-time cumulative step line — one step up per newly collected item. */
export function CollectionChart({ data, color }: CollectionChartProps) {
  const stroke = colorVar(color);
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickFormatter={(ts: number) =>
            new Date(ts).toLocaleDateString(undefined, {
              month: "short",
              year: "2-digit",
            })
          }
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-baseline)", strokeWidth: 1 }}
          content={(p) => (
            <ChartTooltip
              {...p}
              color={stroke}
              unit=""
              heading={
                typeof p.label === "number"
                  ? new Date(p.label).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : undefined
              }
            />
          )}
        />
        <Line
          type="stepAfter"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface MeasurementChartProps {
  data: ReadingPoint[];
  color: string;
  unit: string;
}

export function MeasurementChart({ data, color, unit }: MeasurementChartProps) {
  const stroke = colorVar(color);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-baseline)" }}
          tickFormatter={(ts: number) =>
            new Date(ts).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={["auto", "auto"]}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-baseline)", strokeWidth: 1 }}
          content={(p) => (
            <ChartTooltip
              {...p}
              color={stroke}
              unit={unit}
              heading={
                typeof p.label === "number"
                  ? new Date(p.label).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : undefined
              }
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
