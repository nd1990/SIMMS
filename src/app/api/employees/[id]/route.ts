import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { employeeSchema } from "@/lib/validations";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

async function loadEmployee(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.employee.findFirst({ where });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const employee = await loadEmployee(id, guard.role, guard.companyId);
  if (!employee) return apiError("Employee not found", 404);
  return Response.json({ data: employee });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const existing = await loadEmployee(id, user.role, user.companyId);
  if (!existing) return apiError("Employee not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (user.role !== "MASTER_ADMIN" && parsed.data.companyId !== user.companyId) {
    return apiError("You can only edit employees for your company", 403);
  }

  const dupCode = await prisma.employee.findFirst({
    where: { code: parsed.data.code, id: { not: id } },
  });
  if (dupCode) return apiError("An employee with this code already exists", 409);

  const dupEmail = await prisma.employee.findFirst({
    where: { email: parsed.data.email, id: { not: id } },
  });
  if (dupEmail) return apiError("An employee with this email already exists", 409);

  const { joiningDate: joiningRaw, createLogin, password, ...rest } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { employeeId: id } });

  if (password && !hasPermission(user.role, "users:manage")) {
    return apiError("Only the master admin can manage login accounts", 403);
  }

  if (createLogin && !existingUser) {
    const dupUser = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (dupUser) return apiError("A login account with this email already exists", 409);
  }

  const newEmail = parsed.data.email.toLowerCase();
  const emailChanged = !!existingUser && existingUser.email.toLowerCase() !== newEmail;
  if (emailChanged) {
    const dupUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (dupUser) return apiError("A login account with this email already exists", 409);
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      joiningDate: joiningRaw ? new Date(joiningRaw) : undefined,
    },
  });

  if (emailChanged && existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: newEmail, name: employee.name },
    });
  }

  if (password) {
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash: await bcrypt.hash(password, 10) },
      });
    } else if (createLogin) {
      await prisma.user.create({
        data: {
          name: employee.name,
          email: employee.email.toLowerCase(),
          passwordHash: await bcrypt.hash(password, 10),
          role: employee.role,
          companyId: employee.companyId,
          employeeId: employee.id,
          status: employee.status ? "ACTIVE" : "INACTIVE",
          createdById: user.id,
        },
      });
    }
  }

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Updated employee",
    module: "Employee",
    recordId: id,
    oldValue: { name: existing.name },
    newValue: { name: employee.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: employee });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN" && user.role !== "COMPANY_ADMIN") {
    return apiError("Forbidden", 403);
  }

  const { id } = await ctx.params;
  const existing = await loadEmployee(id, user.role, user.companyId);
  if (!existing) return apiError("Employee not found", 404);

  const reportCount = await prisma.testingReport.count({ where: { testedById: id } });
  if (reportCount > 0) return apiError("Employee has test records. Deactivate instead.", 409);

  await prisma.employee.delete({ where: { id } });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Deleted employee",
    module: "Employee",
    recordId: id,
    oldValue: { name: existing.name },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}