import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.salesOrder.findMany({
    include: { customer: { select: { name: true } }, items: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Sales</h1>
        <Link
          href="/sales/reports"
          className="rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50"
        >
          Reports
        </Link>
      </div>

      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Order</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Date</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Channel</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Customer</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3">
                  <Link href={`/sales/${order.id}`} className="text-jc-rose-gold hover:underline font-mono text-xs">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70">
                  {new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-sm bg-jc-cream px-2 py-1 text-xs text-jc-anchor">{order.channel}</span>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70">{order.customer?.name || "—"}</td>
                <td className="px-4 py-3 text-right text-jc-anchor font-medium">₱{Number(order.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-jc-anchor/70 text-xs">{order.paymentMethod}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-jc-anchor/50">
                  No sales yet. Log your first sale from the Quick Log screen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
