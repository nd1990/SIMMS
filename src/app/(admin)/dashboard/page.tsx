import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Building2,
  FolderKanban,
  MapPin,
  Users,
  FileText,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { CompanyBarChart, MonthlyActivityChart } from "@/components/admin/dashboard-charts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { statusLabels } from "@/lib/constants";

async function getMonthlyTrend(months = 6) {
  const labels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }));
  }

  const trend = await Promise.all(
    labels.map(async (label, idx) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - idx), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const submitted = await prisma.testingReport.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      return { month: label, submitted };
    })
  );
  return trend;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const isMasterAdmin = session.user.role === "MASTER_ADMIN";
  const isCompanyAdminOrSupervisor =
    session.user.role === "COMPANY_ADMIN" || session.user.role === "SUPERVISOR";

  const companyFilter = session.user.companyId ?? undefined;

  const [companiesCount, projectsCount, sitesCount, employeesCount] = await Promise.all([
    prisma.company.count(),
    prisma.project.count(),
    prisma.site.count(),
    prisma.employee.count(),
  ]);

  const reportWhere = companyFilter ? { companyId: companyFilter } : {};

  const [draftCount, submittedCount, rejectedCount] = await Promise.all([
    prisma.testingReport.count({ where: { ...reportWhere, status: "DRAFT" } }),
    prisma.testingReport.count({ where: { ...reportWhere, status: "SUBMITTED" } }),
    prisma.testingReport.count({ where: { ...reportWhere, status: "REJECTED" } }),
  ]);

  // Reports by company (master admin only)
  const companyGroups = await prisma.testingReport.groupBy({
    by: ["companyId"],
    _count: { _all: true },
  });
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });
  const companyChartData = companyGroups.map((g) => {
    const c = companies.find((c) => c.id === g.companyId);
    return { name: c?.name ?? "Unknown", value: g._count._all };
  });

  const monthlyTrend = await getMonthlyTrend(6);

  // Recent testing entries (latest reports)
  const recentReports = await prisma.testingReport.findMany({
    where: reportWhere,
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      site: { select: { name: true } },
      company: { select: { name: true } },
      testedBy: { select: { name: true } },
    },
  });

  const submittedReports = await prisma.testingReport.findMany({
    where: { ...reportWhere, status: "SUBMITTED" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      site: { select: { name: true } },
      company: { select: { name: true } },
      testedBy: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of testing activity across operations"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(isMasterAdmin || isCompanyAdminOrSupervisor) && (
          <StatCard label="Companies" value={companiesCount} icon={Building2} accent="sky" hint="Registered companies" />
        )}
        <StatCard label="Projects" value={projectsCount} icon={FolderKanban} accent="indigo" hint="All projects" />
        <StatCard label="Sites" value={sitesCount} icon={MapPin} accent="green" hint="Test sites" />
        <StatCard label="Employees" value={employeesCount} icon={Users} accent="slate" hint="All staff" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Draft Reports" value={draftCount} icon={FileText} accent="slate" />
        <StatCard label="Submitted" value={submittedCount} icon={FileText} accent="sky" />
        <StatCard label="Rejected" value={rejectedCount} icon={XCircle} accent="red" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Reports by company</CardTitle>
          </CardHeader>
          <CardContent>
            {companyChartData.length > 0 ? (
              <CompanyBarChart data={companyChartData} />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                No report data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Monthly testing activity</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyActivityChart data={monthlyTrend} />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent testing entries</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.reportNumber}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {r.company.name} · {r.site?.name ?? "—"} · {r.testedBy?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={r.status} label={statusLabels[r.status]} />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(r.updatedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Recent submissions</CardTitle>
            <Link href="/reports?status=SUBMITTED" className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400">
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {submittedReports.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {submittedReports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.reportNumber}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {r.site?.name ?? "—"} · {formatDate(r.testingDate)}
                      </p>
                    </div>
                    <Link href={`/reports/${r.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No submissions yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}