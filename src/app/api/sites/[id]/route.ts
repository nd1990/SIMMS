import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { siteSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const where = guard.role === "MASTER_ADMIN" ? { id } : { id, companyId: guard.companyId ?? "none" };
  const site = await prisma.site.findFirst({
    where,
    include: { company: true, project: true },
  });
  if (!site) return apiError("Site not found", 404);
  return Response.json({ data: site });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const where = user.role === "MASTER_ADMIN" ? { id } : { id, companyId: user.companyId ?? "none" };
  const existing = await prisma.site.findFirst({ where });
  if (!existing) return apiError("Site not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = siteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (user.role !== "MASTER_ADMIN" && parsed.data.companyId !== user.companyId) {
    return apiError("You can only edit sites for your company", 403);
  }

  const dup = await prisma.site.findFirst({
    where: { code: parsed.data.code, id: { not: id } },
  });
  if (dup) return apiError("A site with this code already exists", 409);

  const site = await prisma.site.update({
    where: { id },
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      companyId: parsed.data.companyId,
      projectId: parsed.data.projectId || null,
      address: parsed.data.address,
      switchYardName: parsed.data.switchYardName,
      contactPerson: parsed.data.contactPerson,
      contactNumber: parsed.data.contactNumber,
      status: parsed.data.status,
    },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Updated site",
    module: "Site",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: { name: site.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: site });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN" && user.role !== "COMPANY_ADMIN") {
    return apiError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  const where = user.role === "MASTER_ADMIN" ? { id } : { id, companyId: user.companyId ?? "none" };
  const existing = await prisma.site.findFirst({ where });
  if (!existing) return apiError("Site not found", 404);

  const reportCount = await prisma.testingReport.count({ where: { siteId: id } });
  if (reportCount > 0) return apiError("Site has reports. Deactivate instead.", 409);

  await prisma.site.delete({ where: { id } });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Deleted site",
    module: "Site",
    recordId: id,
    oldValue: { name: existing.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}