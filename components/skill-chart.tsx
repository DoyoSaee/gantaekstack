"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "공고 수", color: "var(--chart-1)" },
} satisfies ChartConfig;

// DS §5: 대시보드의 액센트는 1위 막대 하나 — 시장이 지금 가장 세게 간택한 것.
function barColor(i: number): string {
  if (i === 0) return "var(--raspberry)";
  if (i <= 4) return "var(--chart-1)";
  if (i <= 11) return "var(--chart-2)";
  return "var(--chart-3)";
}

export function SkillChart({ data }: { data: { name: string; count: number }[] }) {
  const top = data[0];
  return (
    <ChartContainer
      config={config}
      className="h-[440px] w-full"
      role="img"
      aria-label={
        top
          ? `요구 기술 상위 ${data.length}개 막대 차트. 1위는 ${top.name}, ${top.count}건.`
          : "요구 기술 막대 차트"
      }
    >
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={5}>
          {data.map((d, i) => (
            <Cell key={d.name} fill={barColor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
