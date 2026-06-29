"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteSupplierButton({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete" }));
        throw new Error(err.error);
      }
      toast.success("Supplier deleted");
      router.push("/suppliers");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete supplier");
    } finally {
      setLoading(false);
      setShow(false);
    }
  }

  return (
    <>
      <button onClick={() => setShow(true)}
        className="rounded-sm border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-sm rounded-sm bg-white p-6 shadow-xl">
            <h3 className="font-medium text-jc-anchor">Delete {supplierName}?</h3>
            <p className="mt-2 text-sm text-jc-anchor/70">All linked products and procurement records will be removed.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShow(false)} disabled={loading}
                className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
              <button onClick={handleDelete} disabled={loading}
                className="rounded-sm bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
