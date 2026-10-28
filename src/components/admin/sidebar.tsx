"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  MapPin,
  Users,
  FileText,
  BarChart3,
  Bell,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/sites", label: "Sites", icon: MapPin },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/reports", label: "Testing Reports", icon: FileText },
  { href: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const systemNav = [
  { href: "/admin/users", label: "Users & Roles", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const shownSystemNav = systemNav.filter((item) => {
    if (item.adminOnly) return userRole === "MASTER_ADMIN";
    return true;
  });

  const renderLink = (item: (typeof mainNav)[number] | (typeof systemNav)[number], key: string) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={key}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20"
            : "text-slate-400 hover:bg-white/5 hover:text-white dark:text-slate-400 dark:hover:bg-white/5"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            active
              ? "text-white"
              : "text-slate-500 group-hover:text-sky-400 dark:text-slate-500 dark:group-hover:text-sky-400"
          )}
        />
        {item.label}
        {active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />
        )}
      </Link>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-white via-sky-50 to-teal-50 px-5">
        <BrandLogo className="h-9" />
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">CT Testing</p>
          <p className="text-[11px] font-medium text-slate-500">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainNav.map((item) => renderLink(item, item.href))}

        {shownSystemNav.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              System
            </p>
            {shownSystemNav.map((item) => renderLink(item, item.href))}
          </div>
        )}

        <div className="mt-6">
          <ThemeToggleWide />
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-semibold text-white">
            {(userName || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-[11px] text-slate-400">{userRole.replace(/_/g, " ")}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: withBase("/login") })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent" />
        <div className="relative flex h-full flex-col">{content}</div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="dark:hidden">
            <BrandLogo className="h-7" />
          </span>
          <span className="hidden dark:block">
            <BrandLogo onDark className="h-7" />
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: withBase("/login") })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

function ThemeToggleWide() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[11px] font-medium text-slate-400">Appearance</p>
      <ThemeToggle />
    </div>
  );
}
