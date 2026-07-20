import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./client-page";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: { name: p.category?.name ?? "Uncategorized" },
    variants: p.variants.map((v) => ({ currentStockQty: v.currentStockQty })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/inventory/new" className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light">Add Product</Link>
          <Link href="/inventory/restock" className="rounded-sm border border-jc-blush px-4 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50">Restock</Link>
        </div>
      </div>
      <InventoryClient products={serialized} />
    </div>
  );
}
