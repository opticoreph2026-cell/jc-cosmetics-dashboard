import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/sales" className="text-sm text-jc-rose-gold hover:underline">&larr; Back to Sales</Link>
          <h1 className="font-display text-2xl text-jc-anchor mt-1">Sales Reports</h1>
        </div>
      </div>
      <ReportsClient />
    </div>
  );
}
