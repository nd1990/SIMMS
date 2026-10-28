import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;

  let projectId: string | undefined;
  let folderId: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    projectId = body?.projectId ? String(body.projectId) : undefined;
    folderId = body?.folderId ? String(body.folderId) : undefined;
  } else {
    const form = await request.formData().catch(() => null);
    projectId = form?.get("projectId") ? String(form.get("projectId")) : undefined;
    folderId = form?.get("folderId") ? String(form.get("folderId")) : undefined;
  }

  if (!projectId) return apiError("Select a project", 400);

  const companyScope = user.role === "MASTER_ADMIN" ? {} : { companyId: user.companyId ?? "none" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...companyScope },
  });
  if (!project) return apiError("Project not found", 404);

  const report = await prisma.testingReport.findFirst({
    where: { id, ...companyScope },
  });
  if (!report) return apiError("Report not found", 404);

  const existing = await prisma.projectReportFile.findFirst({ where: { reportId: report.id } });

  const fileData = {
    projectId: project.id,
    companyId: project.companyId,
    siteId: report.siteId,
    folderId: folderId ?? null,
    reportId: report.id,
    originalName: `${report.reportNumber || report.id}.pdf`,
    fileName: report.id,
    storagePath: `reports/${report.id}.pdf`,
    mimeType: "application/pdf",
    fileSize: 0,
    reportType: report.testingType,
    uploadedById: user.id,
    uploadedByName: user.name,
  };

  if (existing) {
    await prisma.projectReportFile.update({
      where: { id: existing.id },
      data: {
        projectId: project.id,
        companyId: project.companyId,
        siteId: report.siteId,
        folderId: folderId ?? (existing.projectId === project.id ? existing.folderId : null),
      },
    });
  } else {
    await prisma.projectReportFile.create({ data: fileData });
  }

  await prisma.testingReport.update({
    where: { id: report.id },
    data: { projectId: project.id },
  });

  return Response.json({
    ok: true,
    data: { reportId: report.id, projectId: project.id, projectName: project.name },
  });
}
