import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lowStockVariants = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: { id: true, currentStockQty: true, reorderPoint: true },
  });
  const lowStockCount = lowStockVariants.filter(
    (v) => v.currentStockQty <= v.reorderPoint
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Revenue Today" value="₱0.00" />
        <StatCard label="Orders Today" value="0" />
        <StatCard label="Low Stock Items" value={String(lowStockCount)} highlight={lowStockCount > 0} />
      </div>

      {lowStockCount > 0 && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Reorder needed:</span> {lowStockCount} variant{lowStockCount > 1 ? "s" : ""} below reorder point.
          {" "}<a href="/inventory/restock" className="underline">Restock now</a>
        </div>
      )}

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <p className="text-sm text-jc-anchor/60">
          Start by adding your inventory, then log your first sale from the Quick Log screen.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-sm border ${highlight ? "border-amber-300" : "border-jc-blush"} bg-white p-5`}>
      <p className="text-xs uppercase tracking-wider text-jc-anchor/60">{label}</p>
      <p className={`mt-1 font-display text-2xl ${highlight ? "text-amber-600" : "text-jc-anchor"}`}>
        {value}
      </p>
    </div>
  );
}
