import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Customers</h1>

      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Name</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Email</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Lifetime Spend</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Since</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-jc-rose-gold hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70 font-mono text-xs">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-jc-anchor/70">{c.email || "—"}</td>
                <td className="px-4 py-3 text-right text-jc-anchor font-medium">₱{Number(c.totalLifetimeSpend).toFixed(2)}</td>
                <td className="px-4 py-3 text-jc-anchor/70">
                  {new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-jc-anchor/50">
                  No customers yet. They will be created automatically when you log sales with a phone number.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
