import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { NewPOForm } from "./new-po-form";

export default async function NewPOPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { supplierProducts: { include: { variant: { select: { id: true, name: true, sku: true } } } } },
  });

  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/suppliers/${supplier.id}`} className="text-sm text-jc-rose-gold hover:underline">
        &larr; Back to {supplier.name}
      </Link>
      <h1 className="font-display text-2xl text-jc-anchor">New Purchase Order — {supplier.name}</h1>
      <NewPOForm supplierId={supplier.id} products={supplier.supplierProducts.map(sp => sp.variant)} />
    </div>
  );
}
