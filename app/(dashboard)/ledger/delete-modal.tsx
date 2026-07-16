"use client";

import { useState } from "react";
import { toast } from "sonner";

export function DeleteLedgerModal({ entryId, changeQty, onClose, onDeleted }: { entryId: string; changeQty: number; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ledger/${entryId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to delete"); }
      toast.success("Ledger entry deleted. Stock adjusted.");
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete ledger entry");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-sm rounded-sm bg-white p-6 shadow-xl">
        <h3 className="font-medium text-jc-anchor">Delete Ledger Entry?</h3>
        <p className="mt-2 text-sm text-jc-anchor/70">
          This will reverse the stock change ({changeQty > 0 ? "+" : ""}{changeQty} units) on the variant and remove this entry from the ledger.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} disabled={deleting}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="rounded-sm bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
