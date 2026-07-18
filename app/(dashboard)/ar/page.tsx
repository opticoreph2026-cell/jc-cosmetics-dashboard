"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DollarSign, Filter } from "lucide-react";

interface ARItem {
  id: string;
  customerId: string;
  customer: { id: string; name: string };
  salesOrderId: string | null;
  amount: string;
  paidAmount: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_FILTERS = ["", "UNPAID", "PARTIAL", "PAID"];

export default function ARPage() {
  const [data, setData] = useState<ARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("UNPAID");
  const [paying, setPaying] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ar?status=${status}`)
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [status]);

  async function handlePayment(id: string) {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      const res = await fetch(`/api/ar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: amount }),
      });
      if (!res.ok) throw new Error("Payment failed");
      toast.success("Payment recorded");
      setPaying(null);
      setPayAmount("");
      const d = await fetch(`/api/ar?status=${status}`).then((r) => r.json());
      setData(Array.isArray(d) ? d : []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const outstanding = data.reduce((sum, item) => sum + (Number(item.amount) - Number(item.paidAmount)), 0);

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Accounts Receivable</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Outstanding</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">₱{outstanding.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Total AR</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">₱{data.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Items</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">{data.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={16} className="text-jc-anchor/40" />
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-sm px-3 py-1.5 text-xs transition-colors ${status === s ? "bg-jc-rose-gold text-white" : "border border-jc-blush text-jc-anchor hover:bg-jc-cream/50"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-jc-blush">
        <table className="w-full text-sm">
          <thead className="bg-jc-cream/50 text-left text-xs uppercase tracking-wider text-jc-anchor/70">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jc-blush">
            {data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-jc-anchor/40">No AR items.</td></tr>
            ) : data.map((item) => {
              const balance = Number(item.amount) - Number(item.paidAmount);
              return (
                <tr key={item.id} className={`hover:bg-jc-cream/20 ${item.status === "UNPAID" ? "bg-red-50/50" : item.status === "PARTIAL" ? "bg-amber-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${item.customerId}`} className="text-jc-rose-gold hover:underline">{item.customer.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-jc-anchor">₱{Number(item.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">₱{Number(item.paidAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{balance > 0 ? `₱${balance.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${item.status === "PAID" ? "bg-green-100 text-green-700" : item.status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-jc-anchor/50">
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-PH") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.status !== "PAID" && (
                      paying === item.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                            className="w-20 rounded-sm border border-jc-blush px-2 py-1 text-xs" autoFocus />
                          <button onClick={() => handlePayment(item.id)} className="text-xs text-green-600 hover:underline">Pay</button>
                          <button onClick={() => { setPaying(null); setPayAmount(""); }} className="text-xs text-jc-anchor/40 hover:underline">X</button>
                        </div>
                      ) : (
                        <button onClick={() => { setPaying(item.id); setPayAmount(String(balance)); }}
                          className="flex items-center gap-1 text-xs text-jc-rose-gold hover:underline">
                          <DollarSign size={12} /> Record Payment
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
