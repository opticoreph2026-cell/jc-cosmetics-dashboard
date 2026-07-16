import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteProductButton } from "./delete-button";
import { VariantSuppliers } from "./variant-suppliers";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../../_components/table";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        include: {
          supplierProducts: {
            include: { supplier: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventory" className="text-sm text-jc-rose-gold hover:underline">&larr; Back</Link>
          <h1 className="font-display text-2xl text-jc-anchor">{product.name}</h1>
          <p className="text-sm text-jc-anchor/60">{product.category.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/inventory/${id}/edit`}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">Edit</Link>
          <DeleteProductButton productId={product.id} productName={product.name} />
        </div>
      </div>

      {product.description && (
        <p className="text-sm text-jc-anchor/70">{product.description}</p>
      )}

      <div>
        <h2 className="mb-3 font-medium text-jc-anchor">Variants</h2>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>SKU</TH>
              <TH align="right">Cost</TH>
              <TH align="right">Price</TH>
              <TH align="right">Stock</TH>
              <TH align="right">Reorder</TH>
              <TH>Suppliers</TH>
            </TR>
          </THead>
          <TBody>
            {product.variants.map((v) => (
              <TR key={v.id}>
                <TD className="text-jc-anchor whitespace-nowrap">{v.name}</TD>
                <TD className="font-mono text-xs">{v.sku}</TD>
                <TD align="right">₱{Number(v.unitCost).toFixed(2)}</TD>
                <TD align="right">₱{Number(v.sellingPrice).toFixed(2)}</TD>
                <TD align="right" className={v.currentStockQty <= v.reorderPoint ? "text-amber-600 font-medium" : "text-jc-anchor"}>
                  {v.currentStockQty}
                </TD>
                <TD align="right" className="text-jc-anchor/70">{v.reorderPoint}</TD>
                <TD><VariantSuppliers variantName={v.name} links={v.supplierProducts as any} /></TD>
              </TR>
            ))}
            {product.variants.length === 0 && <Empty colSpan={7}>No variants yet. Add variants to track stock.</Empty>}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
