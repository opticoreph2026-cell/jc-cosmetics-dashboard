import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteSupplierButton } from "./delete-button";
import { ManageLinkedProducts } from "./manage-linked-products";
import { Table, THead, TBody, TR, TH, TD } from "../../_components/table";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      supplierProducts: {
        include: { variant: { include: { product: { select: { id: true, name: true } } } } },
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
      <div className="flex items-center justify-between">
        <Link href="/suppliers" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Suppliers</Link>
        <div className="flex gap-2">
          <Link href={`/suppliers/${id}/edit`}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Edit</Link>
          <DeleteSupplierButton supplierId={supplier.id} supplierName={supplier.name} />
        </div>
      </div>

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
          <ManageLinkedProducts supplierId={supplier.id} initial={supplier.supplierProducts.map((sp) => ({ ...sp, unitCost: Number(sp.unitCost) }))} />

          <div>
            <h2 className="mb-3 font-medium text-jc-anchor">Recent Procurement</h2>
            {supplier.procurements.length === 0 ? (
              <div className="rounded-sm border border-jc-blush bg-white px-4 py-8 text-center text-sm text-jc-anchor/50">No procurement yet.</div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>PO #</TH>
                    <TH>Date</TH>
                    <TH>Status</TH>
                    <TH align="right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {supplier.procurements.map((po) => (
                    <TR key={po.id}>
                      <TD className="font-mono text-xs text-jc-rose-gold">{po.poNumber}</TD>
                      <TD>
                        {new Date(po.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
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
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
