import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteCustomerButton } from "./delete-button";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        include: {
          items: { include: { variant: { include: { product: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      channelIdentities: true,
    },
  });

  if (!customer) notFound();

  const orderCount = customer.salesOrders.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/customers" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Customers</Link>
        <div className="flex gap-2">
          <Link href={`/customers/${id}/edit`}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Edit</Link>
          <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-sm border border-jc-blush bg-white p-6 lg:col-span-1">
          <h1 className="font-display text-xl text-jc-anchor">{customer.name}</h1>
          {customer.phone && <p className="mt-1 text-sm text-jc-anchor/70 font-mono">{customer.phone}</p>}
          {customer.email && <p className="text-sm text-jc-anchor/70">{customer.email}</p>}

          <div className="mt-4 space-y-2 border-t border-jc-blush pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-jc-anchor/60">Lifetime Spend</span>
              <span className="font-medium text-jc-anchor">₱{Number(customer.totalLifetimeSpend).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-jc-anchor/60">Orders</span>
              <span className="text-jc-anchor">{orderCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-jc-anchor/60">Since</span>
              <span className="text-jc-anchor">
                {new Date(customer.createdAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {customer.channelIdentities.length > 0 && (
            <div className="mt-4 border-t border-jc-blush pt-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/50 mb-2">Channel Identities</p>
              {customer.channelIdentities.map((ci) => (
                <div key={ci.id} className="flex items-center gap-2 text-xs text-jc-anchor/70">
                  <span className="rounded-sm bg-jc-cream px-2 py-0.5">{ci.channel}</span>
                  {ci.channelCustomerId}
                </div>
              ))}
            </div>
          )}

          {customer.notes && (
            <div className="mt-4 border-t border-jc-blush pt-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/50 mb-1">Notes</p>
              <p className="text-sm text-jc-anchor/70">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="rounded-sm border border-jc-blush bg-white lg:col-span-2">
          <div className="border-b border-jc-blush px-4 py-3">
            <h2 className="font-medium text-jc-anchor">Order History</h2>
          </div>
          {orderCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-jc-anchor/50">No orders yet.</div>
          ) : (
            <div className="divide-y divide-jc-blush/50">
              {customer.salesOrders.map((order) => (
                <div key={order.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/sales/${order.id}`} className="text-sm text-jc-rose-gold hover:underline font-mono">
                      {order.orderNumber}
                    </Link>
                    <span className="text-xs text-jc-anchor/50">
                      {new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-sm bg-jc-cream px-2 py-0.5 text-xs text-jc-anchor">{order.channel}</span>
                    <span className="text-xs text-jc-anchor/70">{order.paymentMethod}</span>
                    <span className="ml-auto text-sm font-medium text-jc-anchor">₱{Number(order.total).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-xs text-jc-anchor/50">
                    {order.items.map((item) => item.variant.product.name).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
