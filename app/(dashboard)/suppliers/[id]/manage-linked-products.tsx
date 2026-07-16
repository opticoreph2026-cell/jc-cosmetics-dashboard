"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../../_components/table";

type LinkedProduct = {
  id: string;
  variant: { id: string; name: string; sku: string; product: { id: string; name: string } };
  unitCost: number;
};

type Product = { id: string; name: string; variants: { id: string; name: string; unitCost: number }[] };

export function ManageLinkedProducts({ supplierId, initial }: { supplierId: string; initial: LinkedProduct[] }) {
  const router = useRouter();
  const [linked, setLinked] = useState(initial);
  useEffect(() => { setLinked(initial); }, [initial]);
  const [showLink, setShowLink] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory?variants=true").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setProducts(data);
    }).catch(() => toast.error("Failed to load products"));
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants || [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  useEffect(() => {
    if (selectedVariant && selectedVariant.unitCost) {
      setUnitCost(String(selectedVariant.unitCost));
    }
  }, [selectedVariantId]);

  async function handleLink() {
    if (!selectedVariantId || !unitCost) return;
    setSaving(true);
    try {
      const res = await fetch("/api/supplier-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, variantId: selectedVariantId, unitCost: parseFloat(unitCost) }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to link"); }
      toast.success("Product linked");
      setShowLink(false);
      setSelectedProductId("");
      setSelectedVariantId("");
      setUnitCost("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to link product");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(linkId: string) {
    setDeleting(linkId);
    try {
      const res = await fetch(`/api/supplier-products/${linkId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to unlink"); }
      toast.success("Product unlinked");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to unlink product");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-jc-anchor">Linked Products</h2>
        <button onClick={() => setShowLink(true)}
          className="text-sm text-jc-rose-gold hover:underline">+ Link Product</button>
      </div>

      {linked.length === 0 ? (
        <div className="rounded-sm border border-jc-blush bg-white px-4 py-8 text-center text-sm text-jc-anchor/50">No products linked.</div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Variant</TH>
              <TH align="right">Unit Cost</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {linked.map((sp) => (
              <TR key={sp.id}>
                <TD className="text-jc-anchor truncate max-w-[200px]">{sp.variant.product.name}</TD>
                <TD>{sp.variant.name}</TD>
                <TD align="right">₱{Number(sp.unitCost).toFixed(2)}</TD>
                <TD>
                  <button onClick={() => handleUnlink(sp.id)} disabled={deleting === sp.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50">
                    {deleting === sp.id ? "..." : "Unlink"}
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {showLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-xl">
            <h3 className="font-medium text-jc-anchor">Link Product</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Product</label>
                <select value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); setSelectedVariantId(""); }}
                  className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none">
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedProduct && (
                <div>
                  <label className="block text-xs text-jc-anchor/60 mb-1">Variant</label>
                  <select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none">
                    <option value="">Select variant...</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-jc-anchor/60 mb-1">Unit Cost (₱)</label>
                <input type="number" step="0.01" min="0" value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShowLink(false)} disabled={saving}
                className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
              <button onClick={handleLink} disabled={saving || !selectedVariantId || !unitCost}
                className="rounded-sm bg-jc-rose-gold px-3 py-1.5 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
                {saving ? "Linking..." : "Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
