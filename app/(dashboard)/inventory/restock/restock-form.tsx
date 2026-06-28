"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RestockForm({
  variants,
  suppliers,
}: {
  variants: { id: string; name: string; sku: string; product: { name: string }; currentStockQty: number }[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantId || !supplierId || !qty || !unitCost) return;
    setLoading(true);

    try {
      const res = await fetch("/api/inventory/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, supplierId, qty, unitCost: parseFloat(unitCost) }),
      });
      if (!res.ok) throw new Error("Failed to restock");
      toast.success("Stock added");
      setQty(1);
      setUnitCost("");
      router.refresh();
    } catch {
      toast.error("Failed to restock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-jc-blush bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-jc-anchor">Variant</label>
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          required
          className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        >
          <option value="">Select variant...</option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.product.name} — {v.name} ({v.sku}) [Stock: {v.currentStockQty}]
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-jc-anchor">Supplier</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          required
          className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
        >
          <option value="">Select supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Quantity</label>
          <input
            type="number"
            min={1}
            required
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-jc-anchor">Unit Cost (₱)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-jc-rose-gold px-4 py-2 text-sm font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50"
      >
        {loading ? "Adding stock..." : "Add Stock"}
      </button>
    </form>
  );
}
