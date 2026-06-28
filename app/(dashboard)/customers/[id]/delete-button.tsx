"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Customer deleted");
      router.push("/customers");
      router.refresh();
    } catch {
      toast.error("Failed to delete customer");
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
            <h3 className="font-medium text-jc-anchor">Delete {customerName}?</h3>
            <p className="mt-2 text-sm text-jc-anchor/70">This will anonymize their order history.</p>
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
