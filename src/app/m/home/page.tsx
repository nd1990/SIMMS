import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText, ChevronRight, Send, Gauge } from "lucide-react";
import { cn, initials, formatDate } from "@/lib/utils";
import { OfflineSavesCard } from "@/components/mobile/offline-status";
import { PdfIcon } from "@/components/pdf-icon";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const employeeId = session.user.employeeId;

  const [user, myDrafts, mySubmitted, corrections, myReports] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    }),
    prisma.testingReport.findMany({
      where: {
        testedById: employeeId ?? "none",
        status: "DRAFT",
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { site: { select: { name: true } } },
    }),
    prisma.testingReport.count({
      where: { testedById: employeeId ?? "none", status: { in: ["SUBMITTED", "APPROVED", "GENERATED"] } },
    }),
    prisma.testingReport.count({
      where: { testedById: employeeId ?? "none", status: { in: ["REJECTED", "CORRECTION_REQUESTED"] } },
    }),
    prisma.testingReport.count({
      where: { testedById: employeeId ?? "none" },
    }),
  ]);

  const name = user?.name ?? "Technician";
  const first = name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white ring-2 ring-white/20">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-sky-300">{greeting}</p>
            <h1 className="truncate text-xl font-bold">{first} 👋</h1>
            <p className="truncate text-xs text-slate-300">{formatDate(new Date().toISOString())} · Field testing console</p>
          </div>
        </div>
        {corrections > 0 && (
          <Link
            href="/m/drafts"
            className="relative mt-4 flex items-center gap-2 rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold">
              {corrections}
            </span>
            report{corrections > 1 ? "s" : ""} need{corrections === 1 ? "s" : ""} your correction — tap to fix & resubmit
          </Link>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/m/reports"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Send className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{mySubmitted}</p>
          <p className="text-xs font-medium text-slate-500">Reports submitted</p>
        </Link>
        <Link
          href="/m/downloads"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <PdfIcon className="h-6 w-6" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{myReports}</p>
          <p className="text-xs font-medium text-slate-500">Report PDF</p>
        </Link>
        <OfflineSavesCard />
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-bold text-slate-900">Start a new test</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              href: "/m/drafts?new=POWER_TR_STAR_STAR",
              icon: Gauge,
              chip: "bg-indigo-100 text-indigo-600",
              title: "Power TR Testing Report (Star-Star TR)",
              desc: "Ratio, MB, winding, IR & Tan Delta — all 7 sheets",
              wide: true,
            },
          ].map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className={cn(
                "group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]",
                t.wide && "col-span-2"
              )}
            >
              <div className={cn("mb-2 flex h-10 w-10 items-center justify-center rounded-xl", t.chip)}>
                <t.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Continue last draft</h2>
          <Link href="/m/drafts" className="flex items-center gap-0.5 text-xs font-semibold text-sky-600">
            All drafts <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2.5">
          {myDrafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center">
              <FileText className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No drafts yet.</p>
              <p className="text-xs text-slate-400">Pick a test above to begin.</p>
            </div>
          ) : (
            myDrafts.map((d) => (
              <Link
                key={d.id}
                href={`/m/reports/${d.id}/edit`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.reportNumber}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d.site?.name ?? "No site"} · {d.testingType.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}