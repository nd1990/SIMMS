import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Send, Gauge, Activity, ShieldCheck, FileText } from "lucide-react";
import { cn, initials, formatDate } from "@/lib/utils";
import { OfflineSavesCard } from "@/components/mobile/offline-status";
import { StartTestCard } from "@/components/mobile/start-test-card";
import { PdfIcon } from "@/components/pdf-icon";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const employeeId = session.user.employeeId;

  const [user, mySubmitted, corrections, myReports, sites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
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
    prisma.site.findMany({
      where: session.user.companyId ? { companyId: session.user.companyId } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
              code: "POWER_TR_STAR_STAR",
              icon: Gauge,
              chip: "bg-indigo-100 text-indigo-600",
              title: "Power Transformer Testing Report",
              desc: "Ratio, MB, winding, IR & Tan Delta — all 7 sheets",
              wide: true,
            },
            {
              code: "CB_66KV",
              icon: Gauge,
              chip: "bg-sky-100 text-sky-600",
              title: "66 KV CB Testing Report",
              desc: "Name plate, IR, operations, indications, CRM & timing",
              wide: true,
            },
            {
              code: "MCT_66KV",
              icon: Activity,
              chip: "bg-amber-100 text-amber-600",
              title: "66 KV MCT Testing Report",
              desc: "Core details, IR, winding, polarity, ratio & series test",
              wide: true,
            },
            {
              code: "PCT_66KV",
              icon: ShieldCheck,
              chip: "bg-rose-100 text-rose-600",
              title: "66 KV PCT Testing Report",
              desc: "4 cores, core identification, ratio, knee point & metering",
              wide: true,
            },
            {
              code: "MPT_66KV",
              icon: FileText,
              chip: "bg-cyan-100 text-cyan-600",
              title: "66 KV MPT Testing Report",
              desc: "Metering PT - Name plate, Capacitance & Tan Delta, IR, Polarity, Ratio",
              wide: true,
            },
            {
              code: "PPT_66KV",
              icon: FileText,
              chip: "bg-indigo-100 text-indigo-600",
              title: "66 KV PPT Testing Report",
              desc: "Bus PT - Name plate, Capacitance & Tan Delta, IR, Polarity, Ratio",
              wide: true,
            },
            {
              code: "RELAY_66_33KV",
              icon: Activity,
              chip: "bg-emerald-100 text-emerald-600",
              title: "66/33 KV Relay Testing Report",
              desc: "Relay details, visual inspection & testing",
              wide: true,
            },
          ].map((t) => (
            <StartTestCard
              key={t.title}
              templateCode={t.code}
              siteId={sites[0]?.id ?? null}
              label={t.title}
              className={cn(
                "group rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition active:scale-[0.98]",
                t.wide && "col-span-2"
              )}
            >
              <div className={cn("mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl", t.chip)}>
                <t.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
            </StartTestCard>
          ))}
        </div>
      </section>
    </div>
  );
}