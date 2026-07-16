"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SupplierLink = { id: string; supplier: { id: string; name: string } };

export function VariantSuppliers({ variantName, links }: { variantName: string; links: SupplierLink[] }) {
  const router = useRouter();
  const [unlinking, setUnlinking] = useState<string | null>(null);

  async function handleUnlink(linkId: string) {
    setUnlinking(linkId);
    try {
      const res = await fetch(`/api/supplier-products/${linkId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.text(); throw new Error(err || "Failed to unlink"); }
      toast.success("Supplier unlinked");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to unlink");
    } finally {
      setUnlinking(null);
    }
  }

  if (links.length === 0) return <span className="text-xs text-jc-anchor/50">No suppliers</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {links.map((l) => (
        <span key={l.id} className="inline-flex items-center gap-1 rounded-sm bg-jc-cream px-1.5 py-0.5 text-xs text-jc-anchor">
          {l.supplier.name}
          <button onClick={() => handleUnlink(l.id)} disabled={unlinking === l.id}
            className="text-red-400 hover:text-red-600 disabled:opacity-50">&times;</button>
        </span>
      ))}
    </div>
  );
}
