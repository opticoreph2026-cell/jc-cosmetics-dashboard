"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function CategoryChart({ data }: { data: { category: string; revenue: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#5C4033" }} />
        <YAxis tick={{ fontSize: 10, fill: "#5C4033" }} />
        <Tooltip />
        <Bar dataKey="revenue" fill="#D2A08C" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
