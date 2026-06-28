import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Link href="/sales" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Sales</Link>
      <h1 className="font-display text-2xl text-jc-anchor">Sales Reports</h1>
      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <p className="text-sm text-jc-anchor/60">
          Revenue and margin charts by channel and category will appear here once you have logged sales data.
        </p>
      </div>
    </div>
  );
}
