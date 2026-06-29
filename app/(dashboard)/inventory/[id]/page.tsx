import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteProductButton } from "./delete-button";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../../_components/table";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
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
              <TH className="max-w-[200px]">Name</TH>
              <TH hiddenOn="md">SKU</TH>
              <TH align="right" hiddenOn="sm">Cost</TH>
              <TH align="right" hiddenOn="sm">Price</TH>
              <TH align="right">Stock</TH>
              <TH align="right" hiddenOn="md">Reorder</TH>
            </TR>
          </THead>
          <TBody>
            {product.variants.map((v) => (
              <TR key={v.id}>
                <TD className="text-jc-anchor truncate max-w-[200px]">{v.name}</TD>
                <TD hiddenOn="md" className="font-mono text-xs">{v.sku}</TD>
                <TD align="right" hiddenOn="sm">₱{Number(v.unitCost).toFixed(2)}</TD>
                <TD align="right" hiddenOn="sm">₱{Number(v.sellingPrice).toFixed(2)}</TD>
                <TD align="right" className={v.currentStockQty <= v.reorderPoint ? "text-amber-600 font-medium" : "text-jc-anchor"}>
                  {v.currentStockQty}
                </TD>
                <TD align="right" hiddenOn="md" className="text-jc-anchor/70">{v.reorderPoint}</TD>
              </TR>
            ))}
            {product.variants.length === 0 && <Empty colSpan={6}>No variants yet. Add variants to track stock.</Empty>}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
