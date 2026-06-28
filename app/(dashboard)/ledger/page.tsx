import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function LedgerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const entries = await prisma.inventoryLedger.findMany({
    include: { variant: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Inventory Ledger</h1>
      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Date</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Product</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Variant</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Change</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Previous</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">New</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Reference</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Channel</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3 text-xs text-jc-anchor/70 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-jc-anchor">{e.variant.product.name}</td>
                <td className="px-4 py-3 text-jc-anchor/70 text-xs">{e.variant.name}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs ${e.changeQty > 0 ? "text-green-600" : "text-red-600"}`}>
                  {e.changeQty > 0 ? "+" : ""}{e.changeQty}
                </td>
                <td className="px-4 py-3 text-right text-jc-anchor/70 font-mono text-xs">{e.previousStockQty}</td>
                <td className="px-4 py-3 text-right text-jc-anchor font-mono text-xs">{e.newStockQty}</td>
                <td className="px-4 py-3 text-jc-anchor/70 text-xs">
                  {e.referenceType}{e.referenceId ? `:${e.referenceId.slice(0, 8)}...` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-sm bg-jc-cream px-1.5 py-0.5 text-xs text-jc-anchor/70">{e.channel}</span>
                </td>
                <td className="px-4 py-3 text-jc-anchor/50 text-xs max-w-[120px] truncate">{e.note || "\u2014"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-jc-anchor/50">No ledger entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
