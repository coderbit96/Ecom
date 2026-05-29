"use client";

import {
  BarChart3,
  Bell,
  CreditCard,
  Gauge,
  Gift,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/promotions", label: "Promotions", icon: Gift },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function getPageTitle(pathname: string) {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return match?.label ?? "Admin";
}

export function AdminShell({
  children,
  user,
  logoutAction,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = getPageTitle(pathname);
  const initials =
    user.name
      ?.split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "AD";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-all duration-200 md:flex md:flex-col",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#0f172a] text-sm font-semibold text-white">
            PC
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Premium Commerce</p>
              <p className="text-xs text-slate-500">Admin panel</p>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-[#0f172a] text-white hover:bg-[#0f172a] hover:text-white",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className="w-full justify-center"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="size-4" />
            {!collapsed ? <span>Collapse</span> : null}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-200 md:pl-64",
          collapsed && "md:pl-[72px]"
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Admin</p>
            <h1 className="text-xl font-semibold tracking-tight">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white">
                3
              </span>
            </button>
            <div className="hidden items-center gap-2 md:flex">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className="max-w-36">
                <p className="truncate text-sm font-medium">
                  {user.name ?? "Admin"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="size-4" />
                Logout
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
