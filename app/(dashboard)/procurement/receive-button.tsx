"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReceivePOButton({ poId, poNumber }: { poId: string; poNumber: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReceive() {
    if (!confirm(`Mark ${poNumber} as received? This will update stock quantities.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/procurements/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECEIVED" }),
      });
      if (!res.ok) throw new Error("Failed to receive PO");
      toast.success(`${poNumber} marked as received`);
      router.refresh();
    } catch {
      toast.error("Failed to receive PO");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleReceive} disabled={loading}
      className="rounded-sm bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50">
      {loading ? "..." : "Receive"}
    </button>
  );
}
