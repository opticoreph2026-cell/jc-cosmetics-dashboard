"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function DailyTrendChart({ data }: { data: { date: string; revenue: number; profit: number; units: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5C4033" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#5C4033" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any) => [`₱${Number(v).toFixed(2)}`, undefined]} />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#B78B74" radius={[2, 2, 0, 0]} />
        <Bar dataKey="profit" name="Profit" fill="#5C4033" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
