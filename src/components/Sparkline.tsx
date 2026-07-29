import { Line, LineChart, ResponsiveContainer } from "recharts";
import { colorVar } from "@/lib/types";

interface SparklineProps {
  points: { v: number }[];
  color: string; // color slot name
}

/** Bare trend line for dashboard cards — no axes, no grid, no hover layer. */
export function Sparkline({ points, color }: SparklineProps) {
  if (points.length < 2) {
    return <div className="h-9" />;
  }
  return (
    <div className="h-9">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={colorVar(color)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
