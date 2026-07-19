"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/inventory/reorder", label: "Reorder", icon: RefreshCw },
  { href: "/stock-audit", label: "Stock Audit", icon: ClipboardCheck },
  { href: "/quick-log", label: "Quick Log", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/sales/targets", label: "Targets", icon: Target },
  { href: "/analysis/pricing", label: "Pricing Analysis", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/procurement", label: "Procurement", icon: ClipboardList },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/expenses", label: "Expenses", icon: DollarSign },
  { href: "/ar", label: "A/R", icon: Receipt },
  { href: "/ap", label: "A/P", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-jc-cream text-jc-rose-gold font-medium"
                    : "text-jc-anchor hover:bg-jc-cream/50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
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
