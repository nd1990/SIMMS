import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { hydrateReportPayload } from "@/lib/report-store";
import { ReportDocument } from "@/lib/report-pdf";
import { auditLog, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;

  const { id } = await ctx.params;

  const report = await prisma.testingReport.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, code: true } },
      site: { select: { name: true, switchYardName: true } },
      testedBy: { select: { name: true, designation: true, designationGrade: true } },
      approvals: {
        where: { action: "APPROVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { approvedBy: { select: { name: true, designation: true, designationGrade: true } } },
      },
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

  if (!report) return apiError("Report not found", 404);

  const isOwnerCompanyOrMaster =
    user.role === "MASTER_ADMIN" || report.companyId === user.companyId || report.testedById === user.employeeId;
  if (!isOwnerCompanyOrMaster) return apiError("Forbidden", 403);

  if (!hasPermission(user.role, "reports:generate_pdf")) {
    return apiError("You do not have permission to generate report PDFs", 403);
  }

  const approved = report.approvals[0];

  const payload = await hydrateReportPayload(report as any);

  const pdf = await renderToBuffer(
    createElement(ReportDocument, {
      reportNumber: report.reportNumber,
      payload,
      meta: {
        companyName: report.company.name,
        siteName: report.site?.name,
        switchYardName: report.switchYardName ?? report.site?.switchYardName,
        testingDate: report.testingDate ? report.testingDate.toLocaleDateString("en-IN") : null,
        testedByName: report.testedBy?.name,
        testedByDesignation: report.testedBy?.designation,
        approvedByName: approved?.approvedBy?.name,
        approvedByDesignation: approved?.approvedBy?.designation ?? undefined,
        epcBy: report.epcBy,
        overallResult: report.overallResult,
        finalRemarks: report.finalRemarks,
      },
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  );

  if (report.status === "APPROVED") {
    await prisma.testingReport.update({ where: { id }, data: { status: "GENERATED" } });
  }

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Generated report PDF",
    module: "TestingReport",
    recordId: id,
    newValue: { reportNumber: report.reportNumber },
    ipAddress: getClientIp(_req.headers),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.reportNumber}.pdf"`,
    },
  });
}