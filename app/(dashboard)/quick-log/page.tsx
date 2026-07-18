import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuickLogForm } from "./quick-log-form";

export default async function QuickLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rawVariants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: { select: { name: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const variants = rawVariants.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    product: v.product,
    sellingPrice: Number(v.sellingPrice),
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Quick Log</h1>
      <p className="text-sm text-jc-anchor/60">Log a sale in seconds</p>
      <QuickLogForm variants={variants} />
    </div>
  );
}
