"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, User, Bell, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { NetworkStatus } from "@/components/mobile/network-status";

const items = [
  { href: "/m/home", label: "Home", icon: Home },
  { href: "/m/reports", label: "Reports", icon: FileStack },
  { href: "/m/drafts", label: "Drafts", icon: FileText },
  { href: "/m/profile", label: "Profile", icon: User },
];

export function MobileNav({ unread }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-gradient-to-r from-white via-sky-50 to-teal-50 shadow-sm">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/m/home" className="flex items-center gap-2.5">
            <BrandLogo className="h-8" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-slate-900">CT Testing</span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Field Console
              </span>
            </span>
          </Link>
<div className="flex items-center gap-2">
            <NetworkStatus />
            <Link
              href="/m/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition active:bg-sky-200"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {!!unread && unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.05)]">
        <div className={`mx-auto grid max-w-xl grid-cols-4 pb-[env(safe-area-inset-bottom)]`}>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 pb-2.5 pt-2.5 text-[11px] font-medium transition",
                  active ? "text-sky-600" : "text-slate-400"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition",
                    active && "bg-sky-100"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-sky-600")} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}