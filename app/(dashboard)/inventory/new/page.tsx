import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "./product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">New Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
