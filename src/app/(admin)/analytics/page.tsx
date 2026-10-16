import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import {
  StatusDistributionChart,
  CompanyBarChart,
  MonthlyActivityChart,
} from "@/components/admin/dashboard-charts";

export const metadata = { title: "Reports & Analytics" };

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user.role, "analytics:view")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports & Analytics" />
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="Access restricted"
          description="Your role does not have permission to view analytics."
        />
      </div>
    );
  }

  const viewAll = session.user.role === "MASTER_ADMIN";
  const where = viewAll ? {} : { companyId: session.user.companyId ?? "none" };

  const [reports, companies] = await Promise.all([
    prisma.testingReport.findMany({
      where,
      orderBy: { testingDate: "desc" },
      select: {
        status: true,
        testingDate: true,
        companyId: true,
        company: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: viewAll ? {} : { id: session.user.companyId ?? "none" },
      orderBy: { name: "asc" },
      select: {
        name: true,
        _count: { select: { reports: true, sites: true, projects: true } },
      },
    }),
  ]);

  const statusCounts = new Map<string, number>();
  for (const r of reports) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  const statusData = [...statusCounts.entries()]
    .map(([key, value]) => ({ name: key, value }))
    .sort((a, b) => b.value - a.value);

  const companyTotals = new Map<string, number>();
  for (const r of reports) {
    companyTotals.set(r.company.name, (companyTotals.get(r.company.name) ?? 0) + 1);
  }
  const companyData = [...companyTotals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const byMonth = new Map<string, { submitted: number }>();
  for (const r of reports) {
    if (!r.testingDate) continue;
    const key = r.testingDate.toISOString().slice(0, 7);
    const entry = byMonth.get(key) ?? { submitted: 0 };
    if (r.status === "SUBMITTED" || r.status === "APPROVED" || r.status === "REJECTED") entry.submitted += 1;
    byMonth.set(key, entry);
  }
  const monthData = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, v]) => ({ month, submitted: v.submitted }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Aggregated testing performance across your organisation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Reports by status</h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-400">No reports yet.</p>
          ) : (
            <StatusDistributionChart data={statusData} />
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Reports by company</h2>
          {companyData.length === 0 ? (
            <p className="text-sm text-slate-400">No reports yet.</p>
          ) : (
            <CompanyBarChart data={companyData} />
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Monthly activity</h2>
          {monthData.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet.</p>
          ) : (
            <MonthlyActivityChart data={monthData} />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Companies</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2 text-right">Sites</th>
                <th className="px-3 py-2 text-right">Projects</th>
                <th className="px-3 py-2 text-right">Reports</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.name} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{c._count.sites}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{c._count.projects}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{c._count.reports}</td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                    No companies configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}