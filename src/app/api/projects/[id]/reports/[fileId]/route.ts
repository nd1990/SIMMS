import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

function loadProject(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.project.findFirst({ where });
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;
  const { id, fileId } = await ctx.params;
  const project = await loadProject(id, guard.role, guard.companyId);
  if (!project) return apiError("Project not found", 404);

  const file = await prisma.projectReportFile.findFirst({ where: { id: fileId, projectId: id } });
  if (!file) return apiError("File not found", 404);

  const { readFile } = await import("fs/promises");
  const fsPath = path.join(process.cwd(), file.storagePath);
  const buf = await readFile(fsPath).catch(() => null);

  if (buf) {
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": file.mimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      },
    });
  }

  // Linked testing report without an uploaded binary: generate the PDF on the fly.
  if (file.reportId) {
    const report = await prisma.testingReport.findUnique({
      where: { id: file.reportId },
      include: {
        company: { select: { name: true, code: true } },
        site: { select: { name: true, switchYardName: true } },
        testedBy: { select: { name: true, designation: true, designationGrade: true, stampPath: true } },
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

    if (report) {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { createElement } = await import("react");
      const { hydrateReportPayload } = await import("@/lib/report-store");
      const { ReportDocument } = await import("@/lib/report-pdf");

      const approved = report.approvals[0];
      const payload = await hydrateReportPayload(report as any);
      const pdf = await renderToBuffer(
        createElement(ReportDocument, {
          reportNumber: report.reportNumber,
          payload,
          meta: {
            companyName: report.company?.name ?? "General",
            siteName: report.site?.name,
            switchYardName: report.switchYardName ?? report.site?.switchYardName,
            testingDate: report.testingDate ? report.testingDate.toLocaleDateString("en-IN") : null,
            testedByName: report.testedBy?.name,
            testedByStamp: report.testedBy?.stampPath,
            testedByDesignation: report.testedBy?.designation,
            approvedByName: approved?.approvedBy?.name,
            approvedByDesignation: approved?.approvedBy?.designation ?? undefined,
            epcBy: report.epcBy,
            overallResult: report.overallResult,
            finalRemarks: report.finalRemarks,
          },
        }) as unknown as Parameters<typeof renderToBuffer>[0]
      );

      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
        },
      });
    }
  }

  return apiError("File not found on disk", 404);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);
  const { id, fileId } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  const file = await prisma.projectReportFile.findFirst({ where: { id: fileId, projectId: id } });
  if (!file) return apiError("File not found", 404);

  try {
    const fsPath = path.join(process.cwd(), file.storagePath);
    await unlink(fsPath);
  } catch {}

  await prisma.projectReportFile.delete({ where: { id: fileId } });
  return Response.json({ ok: true });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);
  const { id, fileId } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid data", 400);

  const data: any = {};
  if (body.originalName) data.originalName = String(body.originalName);
  if (body.folderId === null) data.folderId = null;
  if (body.folderId && body.folderId !== "") {
    const folder = await prisma.projectReportFolder.findFirst({ where: { id: String(body.folderId), projectId: id } });
    if (!folder) return apiError("Folder not found", 404);
    data.folderId = folder.id;
  }
  if (body.reportType !== undefined) data.reportType = body.reportType ? String(body.reportType) : null;

  if (body.targetProjectId && String(body.targetProjectId) !== id) {
    const target = await prisma.project.findFirst({
      where: user.role === "MASTER_ADMIN" ? { id: String(body.targetProjectId) } : { id: String(body.targetProjectId), companyId: user.companyId ?? "none" },
    });
    if (!target) return apiError("Target project not found", 404);
    data.projectId = target.id;
    data.companyId = target.companyId;
    data.folderId = null;
  }

  const updated = await prisma.projectReportFile.update({ where: { id: fileId }, data });
  return Response.json({ data: updated });
}
