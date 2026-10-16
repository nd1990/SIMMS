import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import { siteSchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;

  const where = guard.role === "MASTER_ADMIN" ? {} : { companyId: guard.companyId ?? "none" };

  const sites = await prisma.site.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      project: { select: { name: true } },
      _count: { select: { reports: true } },
    },
  });
  return Response.json({ data: sites });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const parsed = siteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  if (user.role !== "MASTER_ADMIN" && parsed.data.companyId !== user.companyId) {
    return apiError("You can only create sites for your company", 403);
  }

  const dup = await prisma.site.findUnique({ where: { code: parsed.data.code } });
  if (dup) return apiError("A site with this code already exists", 409);

  const site = await prisma.site.create({
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
    action: "Created site",
    module: "Site",
    recordId: site.id,
    newValue: { name: site.name, code: site.code },
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ data: site }, { status: 201 });
}