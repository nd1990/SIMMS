import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { companySchema } from "@/lib/validations";

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      projects: true,
      sites: true,
      employees: true,
      reports: { take: 5, orderBy: { createdAt: "desc" } },
    },
  });
  if (!company) return apiError("Company not found", 404);
  return Response.json({ data: company });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return apiError("Company not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  // Code uniqueness check (exclude self)
  const dup = await prisma.company.findFirst({
    where: { code: parsed.data.code, id: { not: id } },
  });
  if (dup) return apiError("A company with this code already exists", 409);

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      address: parsed.data.address,
      contactPerson: parsed.data.contactPerson,
      contactNumber: parsed.data.contactNumber,
      email: parsed.data.email || null,
      gstNumber: parsed.data.gstNumber,
      status: parsed.data.status,
    },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Updated company",
    module: "Company",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: { name: company.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: company });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const existing = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { projects: true, sites: true, employees: true, reports: true } } },
  });
  if (!existing) return apiError("Company not found", 404);

  if (existing._count.reports > 0 || existing._count.projects > 0) {
    return apiError(
      "Company has related records. Deactivate it instead of deleting.",
      409
    );
  }

  await prisma.company.delete({ where: { id } });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Deleted company",
    module: "Company",
    recordId: id,
    oldValue: { name: existing.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}