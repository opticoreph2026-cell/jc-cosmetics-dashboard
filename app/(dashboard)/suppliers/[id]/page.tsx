import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      supplierProducts: {
        include: { variant: { include: { product: { select: { name: true } } } } },
      },
      procurements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <Link href="/suppliers" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Suppliers</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-sm border border-jc-blush bg-white p-6 lg:col-span-1">
          <h1 className="font-display text-xl text-jc-anchor">{supplier.name}</h1>
          {supplier.contactPerson && <p className="mt-1 text-sm text-jc-anchor/70">{supplier.contactPerson}</p>}
          {supplier.email && <p className="text-sm text-jc-anchor/70">{supplier.email}</p>}
          {supplier.phone && <p className="text-sm text-jc-anchor/70">{supplier.phone}</p>}

          {supplier.notes && (
            <div className="mt-4 border-t border-jc-blush pt-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/50 mb-1">Notes</p>
              <p className="text-sm text-jc-anchor/70">{supplier.notes}</p>
            </div>
          )}

          <Link
            href={`/suppliers/${supplier.id}/new-po`}
            className="mt-4 block w-full rounded-sm bg-jc-rose-gold px-4 py-2 text-center text-sm text-white hover:bg-jc-rose-gold-light"
          >
            New Purchase Order
          </Link>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-sm border border-jc-blush bg-white">
            <div className="border-b border-jc-blush px-4 py-3">
              <h2 className="font-medium text-jc-anchor">Linked Products</h2>
            </div>
            {supplier.supplierProducts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-jc-anchor/50">No products linked.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-jc-blush bg-jc-cream/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-jc-anchor">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-jc-anchor">Variant</th>
                    <th className="px-4 py-3 text-right font-medium text-jc-anchor">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.supplierProducts.map((sp) => (
                    <tr key={sp.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                      <td className="px-4 py-3 text-jc-anchor">{sp.variant.product.name}</td>
                      <td className="px-4 py-3 text-jc-anchor/70">{sp.variant.name}</td>
                      <td className="px-4 py-3 text-right text-jc-anchor">₱{Number(sp.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-sm border border-jc-blush bg-white">
            <div className="border-b border-jc-blush px-4 py-3">
              <h2 className="font-medium text-jc-anchor">Recent Procurement</h2>
            </div>
            {supplier.procurements.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-jc-anchor/50">No procurement yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-jc-blush bg-jc-cream/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-jc-anchor">PO #</th>
                    <th className="px-4 py-3 text-left font-medium text-jc-anchor">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-jc-anchor">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.procurements.map((po) => (
                    <tr key={po.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                      <td className="px-4 py-3 font-mono text-xs text-jc-rose-gold">{po.poNumber}</td>
                      <td className="px-4 py-3 text-jc-anchor/70">
                        {new Date(po.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-sm bg-jc-cream px-2 py-0.5 text-xs text-jc-anchor">{po.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-jc-anchor">₱{Number(po.totalCost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
