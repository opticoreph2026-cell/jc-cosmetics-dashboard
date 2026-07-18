import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceivePOButton } from "./receive-button";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";

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
      <Table>
        <THead>
          <TR>
            <TH>PO #</TH>
            <TH>Supplier</TH>
            <TH>Date</TH>
            <TH>Items</TH>
            <TH>Status</TH>
            <TH align="right">Total</TH>
            <TH>Actions</TH>
          </TR>
        </THead>
        <TBody>
          {procurements.map((po) => (
            <TR key={po.id}>
              <TD className="font-mono text-xs text-jc-rose-gold">{po.poNumber}</TD>
              <TD className="text-jc-anchor truncate max-w-[150px]">{po.supplier.name}</TD>
              <TD className="whitespace-nowrap">
                {new Date(po.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
              </TD>
              <TD className="text-xs">
                {po.items.map((i) => `${i.variant.product.name} (x${i.qtyReceived ?? i.qtyOrdered})`).join(", ")}
              </TD>
              <TD>
                <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                  po.status === "RECEIVED" ? "bg-green-100 text-green-700" :
                  po.status === "PARTIALLY_RECEIVED" ? "bg-blue-100 text-blue-700" :
                  po.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                  po.status === "CANCELLED" ? "bg-red-100 text-red-500" :
                  "bg-jc-cream text-jc-anchor"
                }`}>{({ PENDING: "Pending", ORDERED: "Ordered", PARTIALLY_RECEIVED: "Partial", RECEIVED: "Received", CANCELLED: "Cancelled" } as Record<string, string>)[po.status] || po.status}</span>
              </TD>
              <TD align="right">₱{Number(po.totalCost).toFixed(2)}</TD>
              <TD>{(po.status === "PENDING" || po.status === "PARTIALLY_RECEIVED") && <ReceivePOButton poId={po.id} poNumber={po.poNumber} />}</TD>
            </TR>
          ))}
          {procurements.length === 0 && <Empty colSpan={7}>No procurement orders yet. Create one from a supplier&apos;s page.</Empty>}
        </TBody>
      </Table>
    </div>
  );
}
