import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "./client-page";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    include: { supplierProducts: { include: { variant: { include: { product: { select: { name: true } } } } } } },
    orderBy: { name: "asc" },
  });

  const serialized = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson ?? "",
    productCount: s.supplierProducts.length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Suppliers</h1>
        <a href="/suppliers/new" className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light">Add Supplier</a>
      </div>
      <SuppliersClient suppliers={serialized} />
    </div>
  );
}
