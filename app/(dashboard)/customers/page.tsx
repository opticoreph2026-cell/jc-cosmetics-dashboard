import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CustomersClient } from "./client-page";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialized = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    totalLifetimeSpend: Number(c.totalLifetimeSpend),
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-jc-anchor">Customers</h1>
        <Link href="/customers/new" className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light">Add Customer</Link>
      </div>
      <CustomersClient customers={serialized} />
    </div>
  );
}
