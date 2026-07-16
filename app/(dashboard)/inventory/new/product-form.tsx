"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Category = { id: string; name: string; slug: string };
type VariantInput = { id?: string; name: string; sku: string; unitCost: string; sellingPrice: string; currentStockQty: string; reorderPoint: string };

export function ProductForm({ categories, initialData }: { categories: Category[]; initialData?: any }) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [variants, setVariants] = useState<VariantInput[]>(
    initialData?.variants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      unitCost: String(v.unitCost),
      sellingPrice: String(v.sellingPrice),
      currentStockQty: String(v.currentStockQty),
      reorderPoint: String(v.reorderPoint),
    })) || [{ name: "", sku: "", unitCost: "", sellingPrice: "", currentStockQty: "0", reorderPoint: "0" }]
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function addVariant() {
    setVariants([...variants, { name: "", sku: "", unitCost: "", sellingPrice: "", currentStockQty: "0", reorderPoint: "0" }]);
  }

  function removeVariant(i: number) {
    setVariants(variants.filter((_, idx) => idx !== i));
  }

  function updateVariant(i: number, field: keyof VariantInput, value: string) {
    const next = [...variants];
    next[i][field] = value;
    setVariants(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !name) return;
    if (variants.some((v) => !v.name || !v.sku || !v.unitCost || !v.sellingPrice)) {
      toast.error("Fill in all variant fields");
      return;
    }
    setLoading(true);

    try {
      if (isEdit) {
        const res = await fetch(`/api/inventory/${initialData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, categoryId }),
        });
        if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to update product"); }

        const originalIds: string[] = (initialData.variants || []).map((v: any) => v.id);
        const submittedIds: string[] = [];

        for (const v of variants) {
          if (v.id) {
            submittedIds.push(v.id);
            const r = await fetch(`/api/inventory/variants/${v.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: v.name, sku: v.sku, unitCost: parseFloat(v.unitCost), sellingPrice: parseFloat(v.sellingPrice),
                currentStockQty: parseInt(v.currentStockQty), reorderPoint: parseInt(v.reorderPoint),
              }),
            });
            if (!r.ok) { const err = await r.text(); throw new Error(err || "Failed to update variant"); }
          } else {
            const r = await fetch(`/api/inventory/variants`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: initialData.id, name: v.name, sku: v.sku, unitCost: parseFloat(v.unitCost),
                sellingPrice: parseFloat(v.sellingPrice), currentStockQty: parseInt(v.currentStockQty),
                reorderPoint: parseInt(v.reorderPoint),
              }),
            });
            if (!r.ok) { const err = await r.text(); throw new Error(err || "Failed to create variant"); }
          }
        }

        // delete orphans — variants that existed but were removed from the form
        for (const id of originalIds) {
          if (!submittedIds.includes(id)) {
            const r = await fetch(`/api/inventory/variants/${id}`, { method: "DELETE" });
            if (!r.ok) { const err = await r.text(); throw new Error(err || "Failed to delete removed variant"); }
          }
        }

        toast.success("Product updated");
        router.push("/inventory");
      } else {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, categoryId }),
        });
        if (!res.ok) throw new Error("Failed to create product");
        const product = await res.json();

        for (const v of variants) {
          await fetch(`/api/inventory/variants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id, name: v.name, sku: v.sku, unitCost: parseFloat(v.unitCost),
              sellingPrice: parseFloat(v.sellingPrice), currentStockQty: parseInt(v.currentStockQty),
              reorderPoint: parseInt(v.reorderPoint),
            }),
          });
        }
        toast.success("Product created");
        router.push("/inventory");
      }
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || (isEdit ? "Failed to update product" : "Failed to create product"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded-sm border border-jc-blush bg-white p-6">
        <h2 className="font-medium text-jc-anchor">Product Details</h2>

        <div>
          <label className="block text-sm font-medium text-jc-anchor">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {selectedCategory && selectedCategory.slug === "cosmetics" && (
          <div className="rounded-sm bg-jc-cream/30 p-3 text-sm text-jc-anchor/70">
            Cosmetic product — add shades, finish, and size info in each variant below.
          </div>
        )}
        {selectedCategory && selectedCategory.slug === "apparel" && (
          <div className="rounded-sm bg-jc-cream/30 p-3 text-sm text-jc-anchor/70">
            Apparel product — add size, material, and color info in each variant below.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-jc-anchor">Product Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-jc-anchor">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="mt-1 block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
        </div>
      </div>

      <div className="space-y-4 rounded-sm border border-jc-blush bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-jc-anchor">Variants</h2>
          <button type="button" onClick={addVariant}
            className="text-sm text-jc-rose-gold hover:underline">+ Add variant</button>
        </div>

        {variants.map((v, i) => (
          <div key={i} className="rounded-sm border border-jc-blush/50 bg-jc-cream/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-jc-anchor/60">Variant {i + 1}</span>
              {variants.length > 1 && (
                <button type="button" onClick={() => removeVariant(i)} className="text-xs text-red-500 hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Name</label>
                <input type="text" required value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)}
                  placeholder="Berry Red" className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">SKU</label>
                <input type="text" required value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)}
                  placeholder="LT-BERRY-01" className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Selling Price (₱)</label>
                <input type="number" step="0.01" min="0" required value={v.sellingPrice}
                  onChange={(e) => updateVariant(i, "sellingPrice", e.target.value)}
                  className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Cost (₱)</label>
                <input type="number" step="0.01" min="0" required value={v.unitCost}
                  onChange={(e) => updateVariant(i, "unitCost", e.target.value)}
                  className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Stock Qty</label>
                <input type="number" min="0" value={v.currentStockQty}
                  onChange={(e) => updateVariant(i, "currentStockQty", e.target.value)}
                  className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Reorder Point</label>
                <input type="number" min="0" value={v.reorderPoint}
                  onChange={(e) => updateVariant(i, "reorderPoint", e.target.value)}
                  className="block w-full rounded-sm border border-jc-blush px-2 py-1.5 text-xs text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-sm bg-jc-rose-gold px-4 py-3 text-sm font-medium text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </button>
        <button type="button" onClick={() => router.push("/inventory")}
          className="rounded-sm border border-jc-blush px-4 py-3 text-sm text-jc-anchor hover:bg-jc-cream/50">
          Cancel
        </button>
      </div>
    </form>
  );
}
