import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { hydrateReportPayload, type HydrationInput } from "@/lib/report-store";
import { withBase } from "@/lib/base-path";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSections } from "@/components/admin/report-sections";
import { ReportDeleteButton } from "@/components/admin/report-delete-button";
import { PdfIcon } from "@/components/pdf-icon";
import { statusLabels } from "@/lib/constants";
import { formatDateTime, formatDate } from "@/lib/utils";

export const metadata = { title: "Report Details" };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const report = await prisma.testingReport.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, code: true } },
      site: { select: { name: true, switchYardName: true } },
      project: { select: { name: true } },
      testedBy: { select: { name: true, designation: true, stampPath: true } },
      template: { select: { name: true } },
      ctSpecifications: true,
      ctCores: true,
      capacitanceTanDelta: true,
      insulationResistanceTests: true,
      windingResistanceTests: true,
      polarityTests: true,
      coreIdentificationTests: true,
      ratioTests: true,
      kneePointTests: true,
      ctConnection: true,
      ctSeriesTests: true,
      meteringProtectionCores: true,
      testingChecklist: true,
    },
  });

  if (!report) notFound();

  const canView =
    session.user.role === "MASTER_ADMIN" ||
    report.companyId === session.user.companyId ||
    report.testedById === session.user.employeeId;
  if (!canView) redirect("/unauthorized");

  const canGenerate = hasPermission(session.user.role, "reports:generate_pdf");
  // Master admin can edit any report; other roles with reports:edit can edit
  // reports within their own company.
  const canEdit =
    session.user.role === "MASTER_ADMIN" ||
    (hasPermission(session.user.role, "reports:edit") && report.companyId === session.user.companyId);
  const canDelete =
    session.user.role === "MASTER_ADMIN" ||
    (session.user.role === "COMPANY_ADMIN" && report.companyId === session.user.companyId) ||
    (report.testedById === session.user.employeeId && report.status === "DRAFT");

  const payload = await hydrateReportPayload(report as unknown as HydrationInput);

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.reportNumber}
        description={
          report.site
            ? `${report.site.name}${report.site.switchYardName ? ` · ${report.site.switchYardName}` : ""}`
            : report.testingType.replace(/_/g, " ")
        }
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link
                href={`/reports/${report.id}/edit`}
                className="inline-flex h-10 items-center rounded-md bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
              >
                Edit report
              </Link>
            )}
            {canGenerate && (
              <a
                href={withBase(`/api/reports/${report.id}/pdf`)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                <PdfIcon className="h-4 w-4" tone="light" />
                Generate PDF
              </a>
            )}
            <Link
              href="/reports"
              className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← All reports
            </Link>
            {canDelete && (
              <ReportDeleteButton
                reportId={report.id}
                reportNumber={report.reportNumber}
                redirectTo="/reports"
              />
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={report.status} label={statusLabels[report.status]} />
        <span className="text-sm text-slate-500 dark:text-slate-400">{report.testingType.replace(/_/g, " ")}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Report information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Company" value={report.company.name} />
            <Row label="Project" value={report.project?.name ?? "—"} />
            <Row label="Site" value={report.site?.name ?? "—"} />
            <Row label="Test date" value={report.testingDate ? formatDate(report.testingDate) : "—"} />
            <Row label="Tested by" value={report.testedBy?.name ?? "—"} />
            <Row label="Switchyard" value={report.switchYardName ?? "—"} />
            <Row label="Last updated" value={formatDateTime(report.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>
              {report.template?.name ?? report.testingType.replace(/_/g, " ")} — {report.reportNumber}.
              {report.finalRemarks ? ` Final remarks: ${report.finalRemarks}` : ""}
              {report.overallResult ? ` Overall result: ${report.overallResult}.` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Test data</h2>
        <ReportSections payload={payload} testedByStamp={report.testedBy?.stampPath} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}