import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { projectSchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;

  const where = guard.role === "MASTER_ADMIN" ? {} : { companyId: guard.companyId ?? "none" };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true, code: true } },
      _count: { select: { sites: true, reports: true } },
    },
  });
  return Response.json({ data: projects });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  // Non-master-admins can only create projects inside their own company.
  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  if (user.role !== "MASTER_ADMIN" && parsed.data.companyId !== user.companyId) {
    return apiError("You can only create projects for your company", 403);
  }

  const dup = await prisma.project.findUnique({ where: { code: parsed.data.code } });
  if (dup) return apiError("A project with this code already exists", 409);

  const project = await prisma.project.create({
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
    action: "Created project",
    module: "Project",
    recordId: project.id,
    newValue: { name: project.name, code: project.code },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: project }, { status: 201 });
}