"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function VoidOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleVoid() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to void order");
      toast.success(`Order ${orderNumber} voided`);
      router.push("/sales");
      router.refresh();
    } catch {
      toast.error("Failed to void order");
    } finally {
      setLoading(false);
      setShow(false);
    }
  }

  return (
    <>
      <button onClick={() => setShow(true)}
        className="rounded-sm border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Void</button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 w-full max-w-sm rounded-sm bg-white p-6 shadow-xl">
            <h3 className="font-medium text-jc-anchor">Void {orderNumber}?</h3>
            <p className="mt-2 text-sm text-jc-anchor/70">Stock will be returned to inventory and customer&apos;s lifetime spend will be adjusted.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setShow(false)} disabled={loading}
                className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Cancel</button>
              <button onClick={handleVoid} disabled={loading}
                className="rounded-sm bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {loading ? "Voiding..." : "Void Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
