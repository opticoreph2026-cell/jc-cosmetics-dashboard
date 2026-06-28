import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
      </div>

      {product.description && (
        <p className="text-sm text-jc-anchor/70">{product.description}</p>
      )}

      <div className="rounded-sm border border-jc-blush bg-white">
        <div className="border-b border-jc-blush px-4 py-3">
          <h2 className="font-medium text-jc-anchor">Variants</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Name</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">SKU</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Price</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Stock</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Reorder</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((v) => (
              <tr key={v.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3 text-jc-anchor">{v.name}</td>
                <td className="px-4 py-3 text-jc-anchor/70 font-mono text-xs">{v.sku}</td>
                <td className="px-4 py-3 text-right text-jc-anchor">₱{Number(v.unitCost).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-jc-anchor">₱{Number(v.sellingPrice).toFixed(2)}</td>
                <td className={`px-4 py-3 text-right ${v.currentStockQty <= v.reorderPoint ? "text-amber-600 font-medium" : "text-jc-anchor"}`}>
                  {v.currentStockQty}
                </td>
                <td className="px-4 py-3 text-right text-jc-anchor/70">{v.reorderPoint}</td>
              </tr>
            ))}
            {product.variants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-jc-anchor/50">
                  No variants yet. Add variants to track stock.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
