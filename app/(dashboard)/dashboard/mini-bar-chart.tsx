"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export function MiniBarChart({ data }: { data: { channel: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data}>
        <XAxis dataKey="channel" tick={{ fontSize: 10, fill: "#5C4033" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any) => [`₱${Number(v).toFixed(2)}`, "Revenue"]} />
        <Bar dataKey="revenue" fill="#B78B74" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
