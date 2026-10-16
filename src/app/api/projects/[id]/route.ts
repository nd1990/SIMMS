import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { projectSchema } from "@/lib/validations";

async function loadProject(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.project.findFirst({ where });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const project = await loadProject(id, guard.role, guard.companyId);
  if (!project) return apiError("Project not found", 404);
  return Response.json({ data: project });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const existing = await loadProject(id, user.role, user.companyId);
  if (!existing) return apiError("Project not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (user.role !== "MASTER_ADMIN" && parsed.data.companyId !== user.companyId) {
    return apiError("You can only edit projects for your company", 403);
  }

  const dup = await prisma.project.findFirst({
    where: { code: parsed.data.code, id: { not: id } },
  });
  if (dup) return apiError("A project with this code already exists", 409);

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      companyId: parsed.data.companyId,
      epcCompany: parsed.data.epcCompany,
      location: parsed.data.location,
      description: parsed.data.description,
      status: parsed.data.status,
    },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Updated project",
    module: "Project",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: { name: project.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: project });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN" && user.role !== "COMPANY_ADMIN") {
    return apiError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  const existing = await loadProject(id, user.role, user.companyId);
  if (!existing) return apiError("Project not found", 404);

  const count = await prisma.site.count({ where: { projectId: id } });
  if (count > 0) return apiError("Project has sites. Deactivate instead.", 409);

  await prisma.project.delete({ where: { id } });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Deleted project",
    module: "Project",
    recordId: id,
    oldValue: { name: existing.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}