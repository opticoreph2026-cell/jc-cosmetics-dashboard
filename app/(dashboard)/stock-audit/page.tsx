"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Search, CheckCircle2, History } from "lucide-react";

interface Variant {
  id: string;
  name: string;
  sku: string;
  currentStockQty: number;
  product: { name: string };
}

interface AuditItem {
  variantId: string;
  actualQty: number;
  notes: string;
}

interface AuditRecord {
  id: string;
  variantId: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  notes: string | null;
  conductedAt: string;
  variant: Variant;
}

export default function StockAuditPage() {
  const [tab, setTab] = useState<"audit" | "history">("audit");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory?variants=true").then((r) => r.json()),
      fetch("/api/inventory/audit").then((r) => r.json()),
    ]).then(([v, a]) => {
      const allVariants: Variant[] = [];
      if (Array.isArray(v)) {
        for (const p of v) {
          if (p.variants) {
            for (const vr of p.variants) {
              allVariants.push({ ...vr, product: { name: p.name } });
            }
          }
        }
      }
      setVariants(allVariants);
      setAudits(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, []);

  function addItem(variantId: string) {
    if (items.some((i) => i.variantId === variantId)) return;
    setItems([...items, { variantId, actualQty: 0, notes: "" }]);
  }

  function removeItem(variantId: string) {
    setItems(items.filter((i) => i.variantId !== variantId));
  }

  function updateItem(variantId: string, field: "actualQty" | "notes", value: number | string) {
    setItems(items.map((i) => (i.variantId === variantId ? { ...i, [field]: value } : i)));
  }

  async function submitAudit() {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to submit audit");
      toast.success(`Audited ${items.length} item(s)`);
      setItems([]);
      const a = await fetch("/api/inventory/audit").then((r) => r.json());
      setAudits(Array.isArray(a) ? a : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredVariants = variants.filter(
    (v) =>
      v.product.name.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-jc-rose-gold hover:underline">&larr; Inventory</Link>
        <h1 className="font-display text-2xl text-jc-anchor mt-1">Stock Audit</h1>
      </div>

      <div className="flex gap-2 border-b border-jc-blush">
        <button onClick={() => setTab("audit")}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${tab === "audit" ? "border-jc-rose-gold text-jc-rose-gold" : "border-transparent text-jc-anchor/60 hover:text-jc-anchor"}`}>
          <Search size={16} /> Conduct Audit
        </button>
        <button onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${tab === "history" ? "border-jc-rose-gold text-jc-rose-gold" : "border-transparent text-jc-anchor/60 hover:text-jc-anchor"}`}>
          <History size={16} /> Audit History
        </button>
      </div>

      {tab === "audit" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-jc-blush bg-white p-4">
            <h2 className="text-sm font-medium text-jc-anchor mb-3">Select Items to Count</h2>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jc-anchor/40" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-sm border border-jc-blush pl-8 pr-3 py-2 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
              />
            </div>
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {filteredVariants.map((v) => {
                const selected = items.some((i) => i.variantId === v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => (selected ? removeItem(v.id) : addItem(v.id))}
                    className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-xs transition-colors ${selected ? "bg-jc-rose-gold/10 text-jc-rose-gold" : "hover:bg-jc-cream/50 text-jc-anchor"}`}
                  >
                    <span className="truncate">{v.product.name} — <span className="text-jc-anchor/60">{v.name}</span></span>
                    <span className="font-mono text-jc-anchor/40">#{v.currentStockQty}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-sm border border-jc-blush bg-white p-4">
            <h2 className="text-sm font-medium text-jc-anchor mb-3">Count Sheet ({items.length})</h2>
            {items.length === 0 ? (
              <p className="text-xs text-jc-anchor/40">Select items from the left to begin counting.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const v = variants.find((x) => x.id === item.variantId);
                  return (
                    <div key={item.variantId} className="rounded-sm border border-jc-blush p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-jc-anchor">{v?.product.name} — {v?.name}</span>
                        <button onClick={() => removeItem(item.variantId)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-jc-anchor/60">Expected: {v?.currentStockQty}</span>
                        <input
                          type="number" min={0}
                          value={item.actualQty}
                          onChange={(e) => updateItem(item.variantId, "actualQty", parseInt(e.target.value) || 0)}
                          className="w-24 rounded-sm border border-jc-blush px-2 py-1 text-xs text-jc-anchor text-right"
                        />
                        <span className="text-xs text-jc-anchor/60">Actual</span>
                        {item.actualQty > 0 && (
                          <span className={`text-xs ${item.actualQty === (v?.currentStockQty ?? 0) ? "text-green-600" : "text-amber-600"}`}>
                            ({item.actualQty - (v?.currentStockQty ?? 0)})
                          </span>
                        )}
                      </div>
                      <input
                        type="text" value={item.notes} onChange={(e) => updateItem(item.variantId, "notes", e.target.value)}
                        placeholder="Notes (optional)"
                        className="mt-2 w-full rounded-sm border border-jc-blush px-2 py-1 text-xs text-jc-anchor"
                      />
                    </div>
                  );
                })}
                <button
                  onClick={submitAudit}
                  disabled={submitting || items.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-jc-rose-gold px-4 py-3 text-sm font-medium text-white hover:bg-jc-rose-gold/90 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> {submitting ? "Submitting..." : `Submit Audit (${items.length} items)`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-jc-blush">
          <table className="w-full text-sm">
            <thead className="bg-jc-cream/50 text-left text-xs uppercase tracking-wider text-jc-anchor/70">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jc-blush">
              {audits.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-jc-anchor/40">No audits yet.</td></tr>
              ) : audits.map((a) => (
                <tr key={a.id} className={`hover:bg-jc-cream/20 ${a.variance !== 0 ? "bg-amber-50/50" : ""}`}>
                  <td className="px-4 py-3 text-xs text-jc-anchor/70 font-mono">
                    {new Date(a.conductedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-jc-anchor">{a.variant.product.name}</td>
                  <td className="px-4 py-3 text-xs text-jc-anchor/70">{a.variant.name} ({a.variant.sku})</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">{a.expectedQty}</td>
                  <td className="px-4 py-3 text-right font-medium">{a.actualQty}</td>
                  <td className={`px-4 py-3 text-right font-medium ${a.variance === 0 ? "text-green-600" : "text-red-600"}`}>
                    {a.variance > 0 ? `+${a.variance}` : a.variance}
                  </td>
                  <td className="px-4 py-3 text-xs text-jc-anchor/50">{a.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
