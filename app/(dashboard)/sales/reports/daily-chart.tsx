"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function DailyChart({ data }: { data: { date: string; revenue: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} accessibilityLayer>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5C4033" }} />
        <YAxis tick={{ fontSize: 10, fill: "#5C4033" }} />
        <Tooltip />
        <Bar dataKey="revenue" fill="#B78B74" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
