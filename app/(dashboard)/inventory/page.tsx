import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Inventory</h1>
        <div className="flex gap-2">
          <Link
            href="/inventory/new"
            className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light"
          >
            Add Product
          </Link>
          <Link
            href="/inventory/restock"
            className="rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50"
          >
            Restock
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Product</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Category</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Variants</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.currentStockQty, 0);
              return (
                <tr key={product.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${product.id}`} className="text-jc-rose-gold hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-jc-anchor/70">{product.category.name}</td>
                  <td className="px-4 py-3 text-jc-anchor/70">{product.variants.length}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">{totalStock}</td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-jc-anchor/50">
                  No products yet. <Link href="/inventory/new" className="text-jc-rose-gold underline">Add your first product</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
