"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export function SalesTrendChart({
  history,
  prediction,
}: {
  history: { month: string; units: number; label: string }[];
  prediction: { month: string; units: number; label: string }[];
}) {
  const actualData = history.map((m) => ({ month: m.label, actual: m.units, prediction: null }));
  const predData = prediction.map((m) => ({ month: m.label, actual: null, prediction: m.units }));
  const allMonths = [...actualData, ...predData];
  const maxVal = Math.max(...allMonths.map((m) => Math.max(m.actual ?? 0, m.prediction ?? 0)), 1);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={allMonths} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5D6CA" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C4033" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, Math.ceil(maxVal * 1.15)]} tick={{ fontSize: 11, fill: "#5C4033" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #E5D6CA" }}
          formatter={(value: any, name: any) => [`${value ?? 0} units`, name === "actual" ? "Actual" : "AI Prediction"]}
        />
        <Area type="monotone" dataKey="actual" stroke="#B78B74" fill="#B78B74" fillOpacity={0.2} strokeWidth={2} name="actual" connectNulls={false} dot={{ r: 3, fill: "#B78B74" }} />
        <Area type="monotone" dataKey="prediction" stroke="#D97706" fill="#D97706" fillOpacity={0.08} strokeWidth={2} strokeDasharray="5 5" name="prediction" connectNulls={false} dot={{ r: 3, fill: "#D97706" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
