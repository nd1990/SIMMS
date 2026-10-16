import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import { initials } from "@/lib/utils";
import { LogoutButton } from "@/components/mobile/logout-button";

export const dynamic = "force-dynamic";

export default async function MobileProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [user, employee] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, status: true },
    }),
    session.user.employeeId
      ? prisma.employee.findUnique({
          where: { id: session.user.employeeId },
          select: { name: true, designation: true, company: { select: { name: true } } },
        })
      : null,
  ]);

  const name = user?.name ?? employee?.name ?? "User";
  const isActive = user?.status === "ACTIVE";

  const rows: [string, string][] = [
    ["Email", user?.email ?? "—"],
    ["Company", employee?.company?.name ?? "—"],
    ["Designation", employee?.designation ?? "—"],
    ["Role", roleLabel(session.user.role)],
  ];

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-base font-bold text-white ring-2 ring-white/20">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{name}</h1>
            <p className="text-sm text-sky-300">{roleLabel(session.user.role)}</p>
          </div>
          <span
            className={
              isActive
                ? "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30"
                : "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-red-400/15 px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/30"
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-red-400"}`} />
            {user?.status ?? "—"}
          </span>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="truncate text-right text-sm font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}