import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ReceivePOButton } from "./receive-button";

export default async function ProcurementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const procurements = await prisma.procurement.findMany({
    include: { supplier: { select: { name: true } }, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Procurement</h1>
      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">PO #</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Date</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Items</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Status</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Actions</th>
            </tr>
          </thead>
          <tbody>
            {procurements.map((po) => (
              <tr key={po.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3 font-mono text-xs text-jc-rose-gold">{po.poNumber}</td>
                <td className="px-4 py-3 text-jc-anchor">{po.supplier.name}</td>
                <td className="px-4 py-3 text-jc-anchor/70 whitespace-nowrap">
                  {new Date(po.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3 text-jc-anchor/70 text-xs">
                  {po.items.map((i) => `${i.variant.product.name} (x${i.qtyReceived ?? i.qtyOrdered})`).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                    po.status === "RECEIVED" ? "bg-green-100 text-green-700" :
                    po.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                    "bg-jc-cream text-jc-anchor"
                  }`}>{po.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-jc-anchor">₱{Number(po.totalCost).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {po.status === "PENDING" && <ReceivePOButton poId={po.id} poNumber={po.poNumber} />}
                </td>
              </tr>
            ))}
            {procurements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-jc-anchor/50">
                  No procurement orders yet. Create one from a supplier&apos;s page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
