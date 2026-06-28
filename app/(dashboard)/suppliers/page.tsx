import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    include: { supplierProducts: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Suppliers</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <Link
            key={s.id}
            href={`/suppliers/${s.id}`}
            className="rounded-sm border border-jc-blush bg-white p-5 hover:border-jc-rose-gold transition-colors"
          >
            <h2 className="font-medium text-jc-anchor">{s.name}</h2>
            {s.contactPerson && <p className="mt-1 text-xs text-jc-anchor/60">{s.contactPerson}</p>}
            <p className="mt-2 text-xs text-jc-anchor/50">{s.supplierProducts.length} product(s) linked</p>
          </Link>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full rounded-sm border border-jc-blush bg-white p-6 text-center text-sm text-jc-anchor/50">
            No suppliers yet.
          </div>
        )}
      </div>
    </div>
  );
}
