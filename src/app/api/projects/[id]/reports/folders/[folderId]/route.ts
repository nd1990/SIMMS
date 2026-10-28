import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";

export const dynamic = "force-dynamic";

function loadProject(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.project.findFirst({ where });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);
  const { id, folderId } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid data", 400);

  const folder = await prisma.projectReportFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder) return apiError("Folder not found", 404);

  if (body.name) {
    const updated = await prisma.projectReportFolder.update({ where: { id: folderId }, data: { name: String(body.name).trim() } });
    return Response.json({ data: updated });
  }
  return Response.json({ data: folder });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);
  const { id, folderId } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  const folder = await prisma.projectReportFolder.findFirst({ where: { id: folderId, projectId: id } });
  if (!folder) return apiError("Folder not found", 404);

  const count = await prisma.projectReportFile.count({ where: { folderId } });
  if (count > 0) return apiError("Folder must be empty to delete", 409);

  await prisma.projectReportFolder.delete({ where: { id: folderId } });
  return Response.json({ ok: true });
}
