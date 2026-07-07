"use client";

/**
 * Session summary: scores count up with spring physics while the radar chart
 * draws itself in (BUILD_PROMPT signature interaction, second half — "this is
 * the moment users screen-record for TikTok"). recharts RadarChart animates
 * on mount by default; we drive the numeric counters ourselves with a spring.
 */
import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import type { AnswerScores } from "@/lib/types";

const DIMENSIONS: { key: keyof Omit<AnswerScores, "justifications">; label: string }[] = [
  { key: "structure", label: "Structure" },
  { key: "relevance", label: "Relevance" },
  { key: "confidence", label: "Confidence" },
  { key: "conciseness", label: "Conciseness" },
];

function CountUp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    spring.set(value);
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className="tnum">{display}</span>;
}

export function ScoreRadar({ averages, overall }: { averages: Record<string, number>; overall: number }) {
  const data = DIMENSIONS.map((d) => ({ dimension: d.label, score: averages[d.key] ?? 0 }));

  return (
    <Card className="p-6">
      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Readiness</p>
        <p className="font-display text-5xl font-semibold text-[var(--color-score)]">
          <CountUp value={overall} />
          <span className="ml-1 text-lg text-[var(--color-muted)]">/10</span>
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--color-line)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="score"
              stroke="var(--color-brass)"
              fill="var(--color-brass)"
              fillOpacity={0.28}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {DIMENSIONS.map((d) => (
          <motion.div key={d.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p className="tnum font-display text-xl font-semibold text-[var(--color-navy)]">
              <CountUp value={averages[d.key] ?? 0} />
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">{d.label}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
