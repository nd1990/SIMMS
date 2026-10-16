import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hydrateReportPayload, type HydrationInput } from "@/lib/report-store";
import { withBase } from "@/lib/base-path";
import { ReportForm } from "@/components/mobile/report-form";
import { hasPermission } from "@/lib/permissions";

export async function MobileReportView({
  params,
  mode,
}: {
  params: Promise<{ id: string }>;
  mode: "view" | "edit";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;

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

  const isMine = report.testedById === session.user.employeeId;
  const isBoss = session.user.role !== "TECHNICIAN";
  if (!isMine && !isBoss) redirect("/m/home");

  const canEdit =
    (isMine || hasPermission(session.user.role, "reports:edit")) &&
    ["DRAFT", "SUBMITTED", "REJECTED", "CORRECTION_REQUESTED"].includes(report.status);

  const canGenerate = hasPermission(session.user.role, "reports:generate_pdf");

  if (mode === "edit" && !canEdit) redirect(`/m/reports/${report.id}`);

  const editable = mode === "edit" && canEdit;

  const payload = await hydrateReportPayload(report as unknown as HydrationInput);

  return (
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
      canEdit={editable}
      canSubmit={editable}
      status={report.status}
      pdfHref={canGenerate ? withBase(`/api/reports/${report.id}/pdf`) : null}
      editHref={mode === "view" && canEdit ? withBase(`/m/reports/${report.id}/edit`) : null}
      backHref={editable ? withBase(`/m/reports/${report.id}`) : null}
    />
  );
}
