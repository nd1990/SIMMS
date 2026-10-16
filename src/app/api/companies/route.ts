import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { companySchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, sites: true, employees: true, reports: true } },
    },
  });
  return Response.json({ data: companies });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;

  if (user.role === "COMPANY_ADMIN" || user.role === "SUPERVISOR" || user.role === "TECHNICIAN") {
    return apiError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const existing = await prisma.company.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return apiError("A company with this code already exists", 409);
  }

  const company = await prisma.company.create({
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
    action: "Created company",
    module: "Company",
    recordId: company.id,
    newValue: { name: company.name, code: company.code },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: company }, { status: 201 });
}