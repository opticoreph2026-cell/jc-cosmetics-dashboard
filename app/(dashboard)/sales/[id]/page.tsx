import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { VoidOrderButton } from "./void-button";

export default async function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { variant: { include: { product: { select: { name: true } } } } },
      },
    },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sales" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Sales</Link>
        <VoidOrderButton orderId={order.id} orderNumber={order.orderNumber} />
      </div>

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <div className="flex items-center justify-between border-b border-jc-blush pb-4">
          <div>
            <h1 className="font-display text-xl text-jc-anchor">{order.orderNumber}</h1>
            <p className="text-sm text-jc-anchor/60">
              {new Date(order.createdAt).toLocaleDateString("en-PH", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <span className="rounded-sm bg-jc-cream px-3 py-1 text-sm text-jc-anchor">{order.channel}</span>
        </div>

        <div className="space-y-3 py-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-jc-anchor">{item.variant.product.name} — {item.variant.name}</p>
                <p className="text-xs text-jc-anchor/50">{item.qty} x ₱{Number(item.unitPriceAtSale).toFixed(2)}</p>
              </div>
              <p className="text-sm text-jc-anchor font-medium">₱{Number(item.subtotal).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-jc-blush pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-jc-anchor/60">Payment</p>
            <p className="text-sm text-jc-anchor">{order.paymentMethod}</p>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-lg text-jc-anchor">Total</p>
            <p className="font-display text-lg text-jc-anchor">₱{Number(order.total).toFixed(2)}</p>
          </div>
        </div>

        {order.customer && (
          <div className="mt-4 border-t border-jc-blush pt-4">
            <p className="text-sm text-jc-anchor/60">Customer</p>
            <Link href={`/customers/${order.customer.id}`} className="text-sm text-jc-rose-gold hover:underline">
              {order.customer.name}
            </Link>
            {order.customer.phone && (
              <p className="text-xs text-jc-anchor/50">{order.customer.phone}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
