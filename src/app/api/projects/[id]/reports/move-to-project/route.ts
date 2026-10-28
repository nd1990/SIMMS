import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";

export const dynamic = "force-dynamic";

function loadProject(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.project.findFirst({ where });
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid data", 400);

  const { reportId, folderId } = body;
  if (!reportId) return apiError("reportId required", 400);

  const report = await prisma.testingReport.findFirst({
    where: { id: String(reportId), companyId: project.companyId },
  });
  if (!report) return apiError("Report not found", 404);

  // If already exists in file manager, update link
  const existing = await prisma.projectReportFile.findFirst({ where: { reportId: report.id } });
  if (existing) {
    const updated = await prisma.projectReportFile.update({
      where: { id: existing.id },
      data: {
        projectId: id,
        companyId: project.companyId,
        siteId: report.siteId,
        folderId: folderId ? String(folderId) : existing.folderId,
      },
    });
    await prisma.testingReport.update({ where: { id: report.id }, data: { projectId: id } });
    return Response.json({ data: updated, projectName: project.name });
  }

  // Create a placeholder reference entry (PDF stored/generated elsewhere; we link metadata)
  const created = await prisma.projectReportFile.create({
    data: {
      projectId: id,
      companyId: project.companyId,
      siteId: report.siteId,
      reportId: report.id,
      folderId: folderId ? String(folderId) : null,
      originalName: `${report.reportNumber || report.id}.pdf`,
      fileName: report.id,
      storagePath: `reports/${report.id}.pdf`,
      mimeType: "application/pdf",
      fileSize: 0,
      reportType: report.testingType,
      uploadedById: user.id,
      uploadedByName: user.name,
    },
  });

  await prisma.testingReport.update({ where: { id: report.id }, data: { projectId: id } });

  return Response.json({ data: created, projectName: project.name });
}
