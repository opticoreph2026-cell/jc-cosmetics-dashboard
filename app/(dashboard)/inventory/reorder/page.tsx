"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Package, ShoppingCart, Truck, FileDown } from "lucide-react";

interface Suggestion {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  sales30: number;
  dailyRate: number;
  daysRemaining: number;
  suggestedQty: number;
  velocity: string;
  preferredSupplier: { id: string; name: string; unitCost: string } | null;
}

export default function ReorderPage() {
  const [data, setData] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/inventory/reorder")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const critical = data.filter((d) => d.currentStock === 0);
  const low = data.filter((d) => d.currentStock > 0 && d.daysRemaining < 14);
  const watch = data.filter((d) => d.daysRemaining >= 14);
  const supFast = data.filter((d) => d.velocity === "fast").length;
  const supSlow = data.filter((d) => d.velocity === "slow" || d.velocity === "none").length;

  const supplierGroups: Record<string, { supplier: { id: string; name: string }; items: Suggestion[] }> = {};
  for (const item of data) {
    if (!item.preferredSupplier) continue;
    const key = item.preferredSupplier.id;
    if (!supplierGroups[key]) supplierGroups[key] = { supplier: item.preferredSupplier, items: [] };
    supplierGroups[key].items.push(item);
  }

  async function generateAllPOs() {
    const groups = Object.values(supplierGroups);
    if (groups.length === 0) {
      toast.error("No items with preferred suppliers");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/procurements/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groups.map((g) => ({
            supplierId: g.supplier.id,
            items: g.items.map((i) => ({ variantId: i.id, qty: i.suggestedQty })),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create POs");
      const pos = await res.json();
      toast.success(`Created ${pos.length} purchase order(s) for ${groups.length} supplier(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventory" className="text-sm text-jc-rose-gold hover:underline">&larr; Inventory</Link>
          <h1 className="font-display text-2xl text-jc-anchor mt-1">Reorder Suggestions</h1>
        </div>
        {Object.keys(supplierGroups).length > 0 && (
          <button onClick={generateAllPOs} disabled={generating}
            className="flex items-center gap-2 rounded-sm bg-jc-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-jc-rose-gold/90 disabled:opacity-50">
            <FileDown size={16} /> {generating ? "Generating..." : `Generate POs (${Object.keys(supplierGroups).length})`}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-sm border border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} /><span className="text-sm font-medium">Out of Stock</span>
          </div>
          <p className="mt-1 font-display text-2xl text-red-800">{critical.length}</p>
        </div>
        <div className="rounded-sm border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Package size={18} /><span className="text-sm font-medium">Low Stock (&lt;14 days)</span>
          </div>
          <p className="mt-1 font-display text-2xl text-amber-800">{low.length}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <div className="flex items-center gap-2 text-jc-anchor">
            <ShoppingCart size={18} /><span className="text-sm font-medium">To Watch</span>
          </div>
          <p className="mt-1 font-display text-2xl text-jc-anchor">{watch.length}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-sm border border-jc-blush bg-white p-8 text-center text-sm text-jc-anchor/60">
          All items are above their reorder points.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-jc-blush">
          <table className="w-full text-sm">
            <thead className="bg-jc-cream/50 text-left text-xs uppercase tracking-wider text-jc-anchor/70">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant / SKU</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Reorder At</th>
                <th className="px-4 py-3 text-right">30d Sales</th>
                <th className="px-4 py-3 text-right">Days Left</th>
                <th className="px-4 py-3 text-center">Velocity</th>
                <th className="px-4 py-3 text-right">Suggested Qty</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jc-blush">
              {data.map((item) => (
                <tr key={item.id} className={`hover:bg-jc-cream/20 ${item.currentStock === 0 ? "bg-red-50" : item.daysRemaining < 14 ? "bg-amber-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-jc-anchor">{item.productName}</td>
                  <td className="px-4 py-3 text-jc-anchor/70">{item.variantName} <span className="text-xs text-jc-anchor/40">({item.sku})</span></td>
                  <td className={`px-4 py-3 text-right font-medium ${item.currentStock === 0 ? "text-red-600" : "text-jc-anchor"}`}>
                    {item.currentStock}
                  </td>
                  <td className="px-4 py-3 text-right text-jc-anchor/70">{item.reorderPoint}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">{item.sales30}</td>
                  <td className={`px-4 py-3 text-right font-medium ${item.daysRemaining === 999 ? "text-jc-anchor/40" : item.daysRemaining < 7 ? "text-red-600" : "text-jc-anchor"}`}>
                    {item.daysRemaining === 999 ? "—" : item.daysRemaining}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.velocity === "fast" ? "bg-green-100 text-green-700" :
                      item.velocity === "medium" ? "bg-blue-100 text-blue-700" :
                      item.velocity === "slow" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {item.velocity === "fast" ? "Fast" : item.velocity === "medium" ? "Med" : item.velocity === "slow" ? "Slow" : "None"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-jc-anchor">{item.suggestedQty}</td>
                  <td className="px-4 py-3 text-jc-anchor/70">
                    {item.preferredSupplier ? (
                      <Link href={`/suppliers/${item.preferredSupplier.id}`} className="text-jc-rose-gold hover:underline">
                        {item.preferredSupplier.name}
                      </Link>
                    ) : (
                      <span className="text-jc-anchor/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/suppliers/${item.preferredSupplier?.id ?? ""}/new-po`}
                      className={`flex items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors ${item.preferredSupplier ? "bg-jc-rose-gold text-white hover:bg-jc-rose-gold/90" : "pointer-events-none bg-jc-cream/50 text-jc-anchor/40"}`}
                    >
                      <Truck size={12} /> PO
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(supplierGroups).length > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60 mb-3">Suppliers &mdash; Quick PO by Supplier</p>
          <div className="space-y-2">
            {Object.entries(supplierGroups).map(([sId, group]) => (
              <div key={sId} className="flex items-center justify-between rounded-sm bg-jc-cream/30 px-4 py-3">
                <div>
                  <Link href={`/suppliers/${sId}`} className="text-sm font-medium text-jc-anchor hover:text-jc-rose-gold">{group.supplier.name}</Link>
                  <p className="text-xs text-jc-anchor/50">{group.items.length} item(s) · ₱{group.items.reduce((s, i) => s + i.suggestedQty * (parseFloat(i.preferredSupplier?.unitCost || "0") || 0), 0).toFixed(2)} est.</p>
                </div>
                <Link href={`/suppliers/${sId}/new-po`}
                  className="flex items-center gap-1 rounded-sm bg-jc-rose-gold px-3 py-1.5 text-xs font-medium text-white hover:bg-jc-rose-gold/90">
                  <Truck size={12} /> Create PO
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
