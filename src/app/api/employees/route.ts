import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { employeeSchema } from "@/lib/validations";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET() {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;

  const where = guard.role === "MASTER_ADMIN" ? {} : { companyId: guard.companyId ?? "none" };

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      user: { select: { id: true, email: true, status: true } },
    },
  });
  return Response.json({ data: employees });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  const companyId = parsed.data.companyId ?? user.companyId;
  if (user.role !== "MASTER_ADMIN" && companyId !== user.companyId) {
    return apiError("You can only add employees for your company", 403);
  }
  if (!companyId) {
    return apiError("Company is required", 400);
  }

  const dupCode = await prisma.employee.findUnique({ where: { code: parsed.data.code } });
  if (dupCode) return apiError("An employee with this code already exists", 409);

  const dupEmail = await prisma.employee.findUnique({ where: { email: parsed.data.email } });
  if (dupEmail) return apiError("An employee with this email already exists", 409);

  const { joiningDate: joiningRaw, createLogin, password, companyId: _c, ...rest } = parsed.data as any;

  if (createLogin) {
    if (!hasPermission(user.role, "users:manage")) {
      return apiError("Only the master admin can create login accounts", 403);
    }
    const dupUser = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (dupUser) return apiError("A login account with this email already exists", 409);
  }

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        ...rest,
        companyId,
        joiningDate: joiningRaw ? new Date(joiningRaw) : undefined,
      },
    });

    if (createLogin) {
      await tx.user.create({
        data: {
          name: created.name,
          email: created.email.toLowerCase(),
          passwordHash: await bcrypt.hash(password as string, 10),
          role: created.role,
          companyId: created.companyId,
          employeeId: created.id,
          status: created.status ? "ACTIVE" : "INACTIVE",
          createdById: user.id,
        },
      });
    }

    return created;
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Created employee",
    module: "Employee",
    recordId: employee.id,
    newValue: { name: employee.name, code: employee.code, loginCreated: createLogin },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: employee }, { status: 201 });
}