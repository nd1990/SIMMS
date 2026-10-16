import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hydrateReportPayload, type HydrationInput } from "@/lib/report-store";
import { hasPermission } from "@/lib/permissions";
import { ReportForm } from "@/components/mobile/report-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { statusLabels } from "@/lib/constants";

export const metadata = { title: "Edit Report" };

export default async function ReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const canManage = hasPermission(session.user.role, "reports:edit") || session.user.role === "MASTER_ADMIN";
  if (!canManage) redirect("/unauthorized");

  const report = await prisma.testingReport.findUnique({
    where: { id },
    include: {
      company: { select: { name: true } },
      site: { select: { name: true } },
      testedBy: { select: { name: true } },
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

  const payload = await hydrateReportPayload(report as unknown as HydrationInput);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${report.reportNumber}`}
        description={report.site?.name ?? report.testingType.replace(/_/g, " ")}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} label={statusLabels[report.status]} />
            <Link
              href={`/reports/${report.id}`}
              className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← Back to report
            </Link>
          </div>
        }
      />

      <div className="max-w-3xl">
        <ReportForm
          report={{
            id: report.id,
            reportNumber: report.reportNumber,
            testingType: report.testingType,
            siteName: report.site?.name ?? null,
            companyName: report.company.name,
            testedByName: report.testedBy?.name ?? null,
          }}
          initialPayload={payload}
          initialMeta={{
            testingDate: report.testingDate ? report.testingDate.toISOString().slice(0, 10) : undefined,
            switchYardName: report.switchYardName ?? undefined,
            epcBy: report.epcBy ?? undefined,
            testReportNo: report.testReportNo ?? undefined,
            overallResult: report.overallResult ?? undefined,
            finalRemarks: report.finalRemarks ?? undefined,
          }}
          canEdit
          canSubmit={false}
          status={report.status}
          returnTo={`/reports/${report.id}`}
        />
      </div>
    </div>
  );
}