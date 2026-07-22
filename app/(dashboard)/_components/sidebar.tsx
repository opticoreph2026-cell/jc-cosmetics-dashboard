"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Truck,
  LogOut,
  Menu,
  X,
  Tags,
  ClipboardList,
  BookOpen,
  DollarSign,
  RefreshCw,
  Target,
  BarChart3,
  ClipboardCheck,
  Receipt,
  Wallet,
  Settings,
  Brain,
  ChevronDown,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

type NavGroup = {
  label: string;
  icon: any;
  children: { href: string; label: string }[];
};

const groups: NavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [{ href: "/dashboard", label: "Overview" }],
  },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { href: "/inventory", label: "All Products" },
      { href: "/inventory/reorder", label: "Reorder" },
      { href: "/inventory/valuation", label: "Valuation" },
      { href: "/stock-audit", label: "Stock Audit" },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { href: "/quick-log", label: "Quick Log" },
      { href: "/sales", label: "Orders" },
      { href: "/sales/targets", label: "Targets" },
      { href: "/sales/reports", label: "Reports" },
    ],
  },
  {
    label: "Analysis",
    icon: Brain,
    children: [
      { href: "/analysis/intelligence", label: "Intelligence Hub" },
      { href: "/analysis/pricing", label: "Pricing Analysis" },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    children: [{ href: "/customers", label: "All Customers" }],
  },
  {
    label: "Suppliers",
    icon: Truck,
    children: [{ href: "/suppliers", label: "All Suppliers" }],
  },
  {
    label: "Finance",
    icon: DollarSign,
    children: [
      { href: "/ar", label: "A/R" },
      { href: "/ap", label: "A/P" },
      { href: "/expenses", label: "Expenses" },
      { href: "/ledger", label: "Ledger" },
    ],
  },
  {
    label: "Procurement",
    icon: ClipboardList,
    children: [{ href: "/procurement", label: "POs" }],
  },
  {
    label: "Categories",
    icon: Tags,
    children: [{ href: "/categories", label: "Manage Categories" }],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [{ href: "/settings", label: "Admin & Password" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) {
      initial[g.label] = g.children.some((c) => pathname.startsWith(c.href));
    }
    return initial;
  });

  function toggle(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-sm border border-jc-blush bg-white p-2 text-jc-anchor lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-jc-blush bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-jc-blush px-5 py-4">
          <Image
            src="/logo.webp"
            alt="JC Cosmetics"
            width={32}
            height={32}
            className="h-8 w-8 rounded-sm object-cover"
          />
          <Link href="/dashboard" className="font-display text-xl tracking-wide text-jc-anchor">
            JC Cosmetics
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-jc-anchor lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const groupActive = group.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
            const isExpanded = expanded[group.label] ?? groupActive;
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggle(group.label)}
                  className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    groupActive
                      ? "bg-jc-cream text-jc-rose-gold font-medium"
                      : "text-jc-anchor hover:bg-jc-cream/50"
                  }`}
                >
                  <group.icon size={18} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-0.5 border-l border-jc-blush/30 pl-2 mt-0.5">
                    {group.children.map((child) => {
                      const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors ${
                            isChildActive
                              ? "text-jc-rose-gold font-medium"
                              : "text-jc-anchor/70 hover:text-jc-anchor"
                          }`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-jc-blush px-3 py-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-jc-anchor hover:bg-jc-cream/50 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
