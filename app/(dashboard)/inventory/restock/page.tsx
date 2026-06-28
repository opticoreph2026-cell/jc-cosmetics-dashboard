import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RestockForm } from "./restock-form";

export default async function RestockPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: { select: { name: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Quick Restock</h1>
      <RestockForm variants={variants} suppliers={suppliers} />
    </div>
  );
}
