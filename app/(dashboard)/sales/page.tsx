import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SalesClient } from "./client-page";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.salesOrder.findMany({
    include: { customer: { select: { name: true } }, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialized = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    channel: o.channel,
    customerName: o.customer?.name ?? "",
    total: Number(o.total),
    paymentMethod: o.paymentMethod,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Sales</h1>
        <Link href="/sales/reports" className="rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50">Reports</Link>
      </div>
      <SalesClient orders={serialized} />
    </div>
  );
}
