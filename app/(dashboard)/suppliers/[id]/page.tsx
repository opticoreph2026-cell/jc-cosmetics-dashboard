import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteSupplierButton } from "./delete-button";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../../_components/table";

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
          <div>
            <h2 className="mb-3 font-medium text-jc-anchor">Linked Products</h2>
            {supplier.supplierProducts.length === 0 ? (
              <div className="rounded-sm border border-jc-blush bg-white px-4 py-8 text-center text-sm text-jc-anchor/50">No products linked.</div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Product</TH>
                    <TH hiddenOn="sm">Variant</TH>
                    <TH align="right">Unit Cost</TH>
                  </TR>
                </THead>
                <TBody>
                  {supplier.supplierProducts.map((sp) => (
                    <TR key={sp.id}>
                      <TD className="text-jc-anchor truncate max-w-[200px]">{sp.variant.product.name}</TD>
                      <TD hiddenOn="sm">{sp.variant.name}</TD>
                      <TD align="right">₱{Number(sp.unitCost).toFixed(2)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-medium text-jc-anchor">Recent Procurement</h2>
            {supplier.procurements.length === 0 ? (
              <div className="rounded-sm border border-jc-blush bg-white px-4 py-8 text-center text-sm text-jc-anchor/50">No procurement yet.</div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>PO #</TH>
                    <TH hiddenOn="sm">Date</TH>
                    <TH>Status</TH>
                    <TH align="right" hiddenOn="sm">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {supplier.procurements.map((po) => (
                    <TR key={po.id}>
                      <TD className="font-mono text-xs text-jc-rose-gold">{po.poNumber}</TD>
                      <TD hiddenOn="sm">
                        {new Date(po.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </TD>
                      <TD>
                        <span className="rounded-sm bg-jc-cream px-2 py-0.5 text-xs text-jc-anchor">{po.status}</span>
                      </TD>
                      <TD align="right" hiddenOn="sm">₱{Number(po.totalCost).toFixed(2)}</TD>
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
