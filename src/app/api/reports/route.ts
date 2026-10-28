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
import {
  CB_TEMPLATE_CODE,
  EQUIPMENT_TEMPLATES,
  MCT_TEMPLATE_CODE,
  MPT_TEMPLATE_CODE,
  PCT_TEMPLATE_CODE,
  PPT_TEMPLATE_CODE,
  RELAY_TEMPLATE_CODE,
  buildCbDefaultPayload,
  buildMctDefaultPayload,
  buildPctDefaultPayload,
  buildPtDefaultPayload,
  isEquipmentTemplateCode,
} from "@/lib/equipment-types";

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
  else if (user.role !== "MASTER_ADMIN" && user.companyId) where.companyId = user.companyId;

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

  if (!template && isEquipmentTemplateCode(templateCode)) {
    const meta = EQUIPMENT_TEMPLATES[templateCode];
    template = await prisma.testingTemplate.upsert({
      where: { code: meta.code },
      update: { isActive: true },
      create: {
        name: meta.name,
        code: meta.code,
        version: "1.0",
        config: { sheets: [...meta.sheets] },
      },
    });
  }

  if (!template) return apiError("Unknown testing template", 404);

  let companyId = user.companyId;

  if (!companyId && user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { companyId: true },
    });
    companyId = emp?.companyId ?? null;
  }

  if (!companyId && siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { companyId: true },
    });
    companyId = site?.companyId ?? null;
  }

  if (!companyId && projectId) {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });
    companyId = proj?.companyId ?? null;
  }

  let company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;

  if (!company) {
    company = await prisma.company.findFirst({
      where: { status: true },
      orderBy: { createdAt: "asc" },
    });
    if (!company) {
      company = await prisma.company.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "Main Company",
          code: "GEN",
          status: true,
        },
      });
    }
    companyId = company.id;
  }

  const reportNumber = await generateReportNumber(company?.code ?? "GEN");

  const report = await prisma.testingReport.create({
    data: {
      reportNumber,
      companyId: companyId!,
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
          : templateCode === CB_TEMPLATE_CODE
          ? { templateCode: CB_TEMPLATE_CODE, cb: buildCbDefaultPayload() }
          : templateCode === MCT_TEMPLATE_CODE
          ? { templateCode: MCT_TEMPLATE_CODE, mct: buildMctDefaultPayload() }
          : templateCode === PCT_TEMPLATE_CODE
          ? { templateCode: PCT_TEMPLATE_CODE, pct: buildPctDefaultPayload() }
          : templateCode === MPT_TEMPLATE_CODE
          ? { templateCode: MPT_TEMPLATE_CODE, mpt: buildPtDefaultPayload(false) }
          : templateCode === PPT_TEMPLATE_CODE
          ? { templateCode: PPT_TEMPLATE_CODE, ppt: buildPtDefaultPayload(true) }
          : templateCode === RELAY_TEMPLATE_CODE
          ? { templateCode: RELAY_TEMPLATE_CODE, relay: {} }
          : templateCode === "66KV_LINE_CT"
          ? buildTemplate2DefaultPayload()
          : { templateCode, version: "1.0" },
    },
  });

  return Response.json({ data: report }, { status: 201 });
}