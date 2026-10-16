import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, scopeWhere } from "@/lib/api";
import { generateReportNumber } from "@/lib/numbering";
import { hasPermission } from "@/lib/permissions";
import { buildTemplate2DefaultPayload } from "@/lib/report-types";
import {
  POWER_TR_TEMPLATE_CODE,
  POWER_TR_TEMPLATE_NAME,
  POWER_TR_SHEETS,
  buildPowerTrDefaultPayload,
} from "@/lib/power-tr-types";

// GET /api/reports?status=DRAFT&mine=true — list reports the user can view.
export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? undefined;
  const mine = params.get("mine") === "true";
  const templateCode = params.get("template") ?? undefined;

  const teamBlocks: string[] = ["dashboard:view", "reports:view_all", "reports:view_company", "reports:edit", "reports:approve", "analytics:view"];
  const isTeamMember = teamBlocks.filter((p) => hasPermission(user.role, p as any)).length > 0;

  const ownOnly = !isTeamMember && user.role === "TECHNICIAN";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mine || ownOnly) where.testedById = user.employeeId ?? "none";
  else if (user.role !== "MASTER_ADMIN") where.companyId = user.companyId ?? "none";

  // Map incoming template code to a report filter
  if (templateCode) {
    where.testingType = templateCode;
  }

  const reports = await prisma.testingReport.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      company: { select: { name: true, code: true } },
      site: { select: { name: true, switchYardName: true } },
      testedBy: { select: { id: true, name: true, designation: true } },
      template: { select: { name: true, code: true } },
      _count: { select: { approvals: true, attachments: true } },
    },
  });

  return Response.json({ data: reports });
}

// POST /api/reports — create a draft report (template-driven).
export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (!hasPermission(user.role, "test:enter")) return apiError("Forbidden", 403);

  const body = await request.json().catch(() => null);
  const templateCode = body?.templateCode;
  const siteId = body?.siteId;
  const projectId = body?.projectId;
  const testingDate = body?.testingDate;

  if (!templateCode) return apiError("templateCode is required", 400);

  let template = await prisma.testingTemplate.findUnique({ where: { code: templateCode } });

  // The transformer template may not exist yet on a database seeded before this
  // feature shipped — create it on demand so drafts can always be started.
  if (!template && templateCode === POWER_TR_TEMPLATE_CODE) {
    template = await prisma.testingTemplate.upsert({
      where: { code: POWER_TR_TEMPLATE_CODE },
      update: { isActive: true },
      create: {
        name: POWER_TR_TEMPLATE_NAME,
        code: POWER_TR_TEMPLATE_CODE,
        version: "1.0",
        config: { sheets: [...POWER_TR_SHEETS] },
      },
    });
  }

  if (!template) return apiError("Unknown testing template", 404);

  const companyId = user.companyId;
  if (!companyId) return apiError("User is not linked to a company", 400);
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const reportNumber = await generateReportNumber(company?.code ?? "GEN");

  const report = await prisma.testingReport.create({
    data: {
      reportNumber,
      companyId,
      projectId: projectId || null,
      siteId: siteId || null,
      templateId: template.id,
      testingType: templateCode,
      testingDate: testingDate ? new Date(testingDate) : new Date(),
      status: "DRAFT",
      testedById: user.employeeId ?? null,
      createdById: user.id,
      data:
        templateCode === POWER_TR_TEMPLATE_CODE
          ? { templateCode: POWER_TR_TEMPLATE_CODE, powerTr: buildPowerTrDefaultPayload() }
          : templateCode === "66KV_LINE_CT"
          ? buildTemplate2DefaultPayload()
          : { templateCode, version: "1.0" },
    },
  });

  return Response.json({ data: report }, { status: 201 });
}