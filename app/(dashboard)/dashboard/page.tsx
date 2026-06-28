import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-jc-anchor">Dashboard</h1>
      <DashboardClient />
    </div>
  );
}
