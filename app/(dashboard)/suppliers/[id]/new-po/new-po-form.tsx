"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function NewPOForm({
  supplierId,
  products,
}: {
  supplierId: string;
  products: { id: string; name: string; sku: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ variantId: "", qty: 1, unitCost: 0 }]);

  function addItem() {
    setItems([...items, { variantId: "", qty: 1, unitCost: 0 }]);
  }

  function updateItem(index: number, field: "variantId" | "qty" | "unitCost", value: string | number) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.some((i) => !i.variantId || i.unitCost <= 0 || i.qty < 1)) return;
    setLoading(true);

    try {
      const res = await fetch("/api/procurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, items }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to create PO"); }
      toast.success("Purchase order created");
      router.push(`/suppliers/${supplierId}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create PO");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-sm border border-jc-blush bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-jc-anchor/60">Item {i + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-jc-anchor/60 mb-1">Variant</label>
              <select
                value={item.variantId}
                onChange={(e) => updateItem(i, "variantId", e.target.value)}
                required
                className="block w-full rounded-sm border border-jc-blush px-2 py-2 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
              >
                <option value="">Select...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-jc-anchor/60 mb-1">Qty</label>
              <input
                type="number"
                min={1}
                required
                value={item.qty}
                onChange={(e) => updateItem(i, "qty", parseInt(e.target.value) || 0)}
                className="block w-full rounded-sm border border-jc-blush px-2 py-2 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-jc-anchor/60 mb-1">Unit Cost (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={item.unitCost || ""}
                onChange={(e) => updateItem(i, "unitCost", parseFloat(e.target.value) || 0)}
                className="block w-full rounded-sm border border-jc-blush px-2 py-2 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={addItem} className="text-sm text-jc-rose-gold hover:underline">
        + Add another item
      </button>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-jc-rose-gold px-4 py-3 text-sm font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Purchase Order"}
      </button>
    </form>
  );
}
