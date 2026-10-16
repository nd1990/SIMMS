import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { userSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError("User not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (parsed.data.role === "MASTER_ADMIN" && parsed.data.companyId) {
    return apiError("Master Admin users do not belong to a company", 400);
  }

  const dup = await prisma.user.findFirst({
    where: { email: parsed.data.email.toLowerCase(), id: { not: id } },
  });
  if (dup) return apiError("A user with this email already exists", 409);

  if (parsed.data.employeeId) {
    const emp = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!emp) return apiError("Linked employee not found", 400);
    const existingLink = await prisma.user.findFirst({
      where: { employeeId: parsed.data.employeeId, id: { not: id } },
    });
    if (existingLink) return apiError("That employee already has a login account", 409);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      companyId: parsed.data.role === "MASTER_ADMIN" ? null : (parsed.data.companyId ?? null),
      employeeId: parsed.data.employeeId ?? null,
      status: parsed.data.status,
      ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) } : {}),
    },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Updated user",
    module: "User",
    recordId: id,
    oldValue: { email: existing.email, role: existing.role },
    newValue: { email: updated.email, role: updated.role },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: { id: updated.id } });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  if (id === user.id) return apiError("You cannot delete your own account", 400);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError("User not found", 404);

  await prisma.user.delete({ where: { id } });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Deleted user",
    module: "User",
    recordId: id,
    oldValue: { email: existing.email, role: existing.role },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}