// components/charts.tsx
// ─── Recharts components — wired to SynthesisResult.chartData ─────

"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ChartDataPoint } from "@/lib/types";

// ─── Colour palette — amber accent matching your design ───────────
const MODEL_COLORS: Record<string, string> = {
  "GPT-4o":  "#f59e0b",   // amber-500
  "Claude":  "#d97706",   // amber-600
  "Gemini":  "#b45309",   // amber-700
  "Llama 3": "#92400e",   // amber-800
};

// ─── Radar chart: quality dimensions per model ────────────────────
interface QualityRadarProps {
  data: ChartDataPoint[];
}

export function QualityRadarChart({ data }: QualityRadarProps) {
  const dimensions = ["accuracy", "reasoning", "coherence", "grounding"] as const;

  const radarData = dimensions.map((dim) => {
    const point: Record<string, string | number> = {
      dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    };
    data.forEach((d) => {
      point[d.model] = d[dim];
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        {data.map((d) => (
          <Radar
            key={d.model}
            name={d.model}
            dataKey={d.model}
            stroke={MODEL_COLORS[d.model] ?? "#f59e0b"}
            fill={MODEL_COLORS[d.model] ?? "#f59e0b"}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Line chart: latency comparison ─────────────────────────────
interface LatencyBarProps {
  data: ChartDataPoint[];
}

export function LatencyBarChart({ data }: LatencyBarProps) {
  // Transpose data: LineChart needs per-metric rows with model columns
  const lineData = data.map((d) => ({
    model: d.model,
    latency: d.latency,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="model"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          unit="ms"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v} ms`, "Latency"]}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ fill: "#f59e0b", r: 5, strokeWidth: 0 }}
          activeDot={{ r: 7, fill: "#f59e0b", stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Line chart: overall scores across models ────────────────────
interface ScoreBarProps {
  data: ChartDataPoint[];
}

export function ScoreBarChart({ data }: ScoreBarProps) {
  const sorted = [...data].sort((a, b) => b.overall - a.overall);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={sorted}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="model"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine y={75} stroke="var(--border)" strokeDasharray="4 2" label={{ value: "75", fill: "var(--muted-foreground)", fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [v, "Overall Score"]}
        />
        <Line
          type="monotone"
          dataKey="overall"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={({ cx, cy, payload }) => (
            <circle
              key={payload.model}
              cx={cx}
              cy={cy}
              r={5}
              fill={MODEL_COLORS[payload.model] ?? "#f59e0b"}
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
          activeDot={{ r: 7, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
