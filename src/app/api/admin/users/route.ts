import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { userSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const where = user.role === "MASTER_ADMIN" ? {} : { companyId: user.companyId };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      employee: { select: { name: true, code: true } },
    },
  });

  return Response.json({
    data: users.map(({ passwordHash: _pw, rememberToken: _rt, ...rest }) => rest),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role !== "MASTER_ADMIN") return apiError("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (parsed.data.role === "MASTER_ADMIN" && parsed.data.companyId) {
    return apiError("Master Admin users do not belong to a company", 400);
  }

  const dup = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (dup) return apiError("A user with this email already exists", 409);

  if (parsed.data.employeeId) {
    const emp = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!emp) return apiError("Linked employee not found", 400);
    const existingLink = await prisma.user.findUnique({ where: { employeeId: parsed.data.employeeId } });
    if (existingLink) return apiError("That employee already has a login account", 409);
    if (!parsed.data.companyId) parsed.data.companyId = emp.companyId ?? undefined;
  }

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password ?? "ChangeMe@123", 10),
      role: parsed.data.role,
      companyId: parsed.data.role === "MASTER_ADMIN" ? null : (parsed.data.companyId ?? null),
      employeeId: parsed.data.employeeId ?? null,
      status: parsed.data.status,
      createdById: user.id,
    },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Created user",
    module: "User",
    recordId: created.id,
    newValue: { email: created.email, role: created.role },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: { id: created.id } }, { status: 201 });
}