import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";

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
      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Product</TH>
            <TH hiddenOn="md">Variant</TH>
            <TH align="right">Change</TH>
            <TH align="right" hiddenOn="md">Previous</TH>
            <TH align="right" hiddenOn="sm">New</TH>
            <TH hiddenOn="md">Reference</TH>
            <TH hiddenOn="md">Channel</TH>
            <TH hiddenOn="md">Note</TH>
          </TR>
        </THead>
        <TBody>
          {entries.map((e) => (
            <TR key={e.id}>
              <TD className="whitespace-nowrap text-xs">
                {new Date(e.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </TD>
              <TD className="text-jc-anchor truncate max-w-[150px]">{e.variant.product.name}</TD>
              <TD hiddenOn="md" className="text-xs">{e.variant.name}</TD>
              <TD align="right" className={`font-mono text-xs ${e.changeQty > 0 ? "text-green-600" : "text-red-600"}`}>
                {e.changeQty > 0 ? "+" : ""}{e.changeQty}
              </TD>
              <TD align="right" hiddenOn="md" className="font-mono text-xs">{e.previousStockQty}</TD>
              <TD align="right" hiddenOn="sm" className="font-mono text-xs text-jc-anchor">{e.newStockQty}</TD>
              <TD hiddenOn="md" className="text-xs">
                {e.referenceType}{e.referenceId ? `:${e.referenceId.slice(0, 8)}...` : ""}
              </TD>
              <TD hiddenOn="md">
                <span className="rounded-sm bg-jc-cream px-1.5 py-0.5 text-xs text-jc-anchor/70">{e.channel}</span>
              </TD>
              <TD hiddenOn="md" className="max-w-[120px] truncate text-jc-anchor/50 text-xs">{e.note || "\u2014"}</TD>
            </TR>
          ))}
          {entries.length === 0 && <Empty colSpan={9}>No ledger entries yet.</Empty>}
        </TBody>
      </Table>
    </div>
  );
}
