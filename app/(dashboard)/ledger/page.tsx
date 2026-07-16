import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LedgerTable } from "./ledger-table";

export default async function LedgerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const raw = await prisma.inventoryLedger.findMany({
    include: { variant: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entries = raw.map((e) => ({
    ...e,
    changeQty: Number(e.changeQty),
    previousStockQty: Number(e.previousStockQty),
    newStockQty: Number(e.newStockQty),
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Inventory Ledger</h1>
      <LedgerTable entries={entries} />
    </div>
  );
}
