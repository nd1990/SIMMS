import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { auditLog, getClientIp } from "@/lib/audit";
import { persistReportPayload, hydrateReportPayload, type HydrationInput } from "@/lib/report-store";

// Never let an exception escape as a bare HTTP 500 with no body: the client
// shows "Save failed (HTTP 500)" for that. Surface the real message instead.
function guard(label: string, run: () => Promise<Response>): Promise<Response> {
  return run().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[reports/[id]] ${label} failed:`, err);
    return apiError(message, 500);
  });
}

async function loadReport(id: string) {
  return prisma.testingReport.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, code: true } },
      site: { select: { name: true, switchYardName: true } },
      testedBy: { select: { name: true, designation: true } },
      ctSpecifications: true,
      ctCores: true,
      capacitanceTanDelta: true,
      insulationResistanceTests: true,
      windingResistanceTests: true,
      polarityTests: true,
      coreIdentificationTests: true,
      ratioTests: true,
      kneePointTests: true,
      ctConnection: true,
      ctSeriesTests: true,
      meteringProtectionCores: true,
      testingChecklist: true,
      approvals: true,
      attachments: true,
    },
  });
}

// GET /api/reports/[id] - full report + hydrated payload for the editor.
export function GET(request: NextRequest, ctx: RouteContext) {
  return guard("GET", async () => {
    const user = await requireApiUser();
    if ("error" in user) return user.error;

    const { id } = await ctx.params;
    const report = await loadReport(id);
    if (!report) return apiError("Report not found", 404);

    const canViewAll = hasPermission(user.role, "reports:view_all");
    if (!(canViewAll || user.role === "MASTER_ADMIN" || report.companyId === user.companyId || report.testedById === user.employeeId)) {
      return apiError("Forbidden", 403);
    }

    const payload = await hydrateReportPayload(report as unknown as HydrationInput);
    return Response.json({ data: report, payload });
  });
}

// PUT /api/reports/[id] - save the report payload (editor "Save" button).
export function PUT(request: NextRequest, ctx: RouteContext) {
  return guard("PUT", async () => {
    const user = await requireApiUser();
    if ("error" in user) return user.error;

    const { id } = await ctx.params;
    const report = await prisma.testingReport.findUnique({ where: { id } });
    if (!report) return apiError("Report not found", 404);

    const canEdit = hasPermission(user.role, "reports:edit") || user.role === "MASTER_ADMIN";
    if (!(canEdit || report.testedById === user.employeeId)) return apiError("Forbidden", 403);

    const body = await request.json().catch(() => null);

    if (body?.payload && (report.testedById === user.employeeId || canEdit)) {
      try {
        await persistReportPayload(id, body.payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[reports/${id}] persistReportPayload failed:`, err);
        return apiError(`Save failed: ${message}`, 500);
      }
    }

    const data: {
      siteId?: string;
      projectId?: string;
      testingDate?: Date;
      switchYardName?: string;
    } = {};
    if (typeof body?.siteId === "string" && body.siteId) data.siteId = body.siteId;
    if (typeof body?.projectId === "string" && body.projectId) data.projectId = body.projectId;
    if (typeof body?.switchYardName === "string" && body.switchYardName) data.switchYardName = body.switchYardName;
    if (typeof body?.testingDate === "string" && body.testingDate) {
      const date = new Date(body.testingDate);
      if (!Number.isNaN(date.getTime())) data.testingDate = date;
    }

    if (Object.keys(data).length > 0) {
      try {
        await prisma.testingReport.update({ where: { id }, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[reports/${id}] report meta update failed:`, err);
        return apiError(`Save failed: ${message}`, 500);
      }
    }

    return Response.json({ data: await loadReport(id) });
  });
}

// PATCH /api/reports/[id] - workflow actions: submit / reopen / meta.
export function PATCH(request: NextRequest, ctx: RouteContext) {
  return guard("PATCH", async () => {
    const user = await requireApiUser();
    if ("error" in user) return user.error;

    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const action = body?.action as string | undefined;

    const report = await prisma.testingReport.findUnique({ where: { id } });
    if (!report) return apiError("Report not found", 404);

    if (action === "submit") {
      if (report.testedById !== user.employeeId && user.role !== "MASTER_ADMIN") {
        return apiError("You can only submit your own reports", 403);
      }
      if (report.status === "SUBMITTED") return Response.json({ ok: true });
      if (report.status !== "DRAFT") return apiError("Only drafts can be submitted", 400);

      await prisma.testingReport.update({
        where: { id },
        data: { status: "SUBMITTED", updatedAt: new Date() },
      });
      await auditLog({
        userId: user.id,
        userName: user.name,
        action: "Submitted report",
        module: "Report",
        recordId: id,
        newValue: { reportNumber: report.reportNumber, status: "SUBMITTED" },
        ipAddress: getClientIp(request.headers),
      });
      return Response.json({ ok: true });
    }

    if (action === "reopen") {
      if (user.role === "TECHNICIAN" && report.testedById !== user.employeeId) return apiError("Forbidden", 403);
      await prisma.testingReport.update({ where: { id }, data: { status: "DRAFT" } });
      return Response.json({ ok: true });
    }

    if (action === "meta") {
      if (user.role === "TECHNICIAN" && report.testedById !== user.employeeId) return apiError("Forbidden", 403);

      const data: {
        overallResult?: string;
        finalRemarks?: string;
        epcBy?: string;
        testReportNo?: string;
        switchYardName?: string;
        testingDate?: Date;
      } = {};
      if (typeof body?.overallResult === "string") data.overallResult = body.overallResult;
      if (typeof body?.finalRemarks === "string") data.finalRemarks = body.finalRemarks;
      if (typeof body?.epcBy === "string") data.epcBy = body.epcBy;
      if (typeof body?.testReportNo === "string") data.testReportNo = body.testReportNo;
      if (typeof body?.switchYardName === "string") data.switchYardName = body.switchYardName;
      if (typeof body?.testingDate === "string" && body.testingDate) {
        const date = new Date(body.testingDate);
        if (!Number.isNaN(date.getTime())) data.testingDate = date;
      }

      if (Object.keys(data).length > 0) {
        await prisma.testingReport.update({ where: { id }, data });
      }
      return Response.json({ ok: true });
    }

    return apiError("Unknown action", 400);
  });
}

// DELETE /api/reports/[id] - remove a report and all of its child rows.
export function DELETE(request: NextRequest, ctx: RouteContext) {
  return guard("DELETE", async () => {
    const user = await requireApiUser();
    if ("error" in user) return user.error;

    const { id } = await ctx.params;
    const report = await prisma.testingReport.findUnique({ where: { id } });
    if (!report) return apiError("Report not found", 404);

    const isMaster = user.role === "MASTER_ADMIN";
    const isCompanyAdmin = user.role === "COMPANY_ADMIN" && report.companyId === user.companyId;
    const isOwnerDraft = report.testedById === user.employeeId && report.status === "DRAFT";
    if (!(isMaster || isCompanyAdmin || isOwnerDraft)) return apiError("Forbidden", 403);

    await prisma.$transaction([
      prisma.testingReading.deleteMany({ where: { reportId: id } }),
      prisma.testingChecklist.deleteMany({ where: { reportId: id } }),
      prisma.cTSpecification.deleteMany({ where: { reportId: id } }),
      prisma.cTCore.deleteMany({ where: { reportId: id } }),
      prisma.capacitanceTanDelta.deleteMany({ where: { reportId: id } }),
      prisma.insulationResistanceTest.deleteMany({ where: { reportId: id } }),
      prisma.windingResistanceTest.deleteMany({ where: { reportId: id } }),
      prisma.polarityTest.deleteMany({ where: { reportId: id } }),
      prisma.coreIdentificationTest.deleteMany({ where: { reportId: id } }),
      prisma.ratioTest.deleteMany({ where: { reportId: id } }),
      prisma.kneePointTest.deleteMany({ where: { reportId: id } }),
      prisma.cTConnection.deleteMany({ where: { reportId: id } }),
      prisma.cTSeriesTest.deleteMany({ where: { reportId: id } }),
      prisma.meteringProtectionCore.deleteMany({ where: { reportId: id } }),
      prisma.reportApproval.deleteMany({ where: { reportId: id } }),
      prisma.attachment.deleteMany({ where: { reportId: id } }),
      prisma.signature.deleteMany({ where: { reportId: id } }),
      prisma.reportNotification.deleteMany({ where: { reportId: id } }),
      prisma.testingReport.delete({ where: { id } }),
    ]);

    await auditLog({
      userId: user.id,
      userName: user.name,
      action: "Deleted report",
      module: "Report",
      recordId: id,
      oldValue: { reportNumber: report.reportNumber, status: report.status },
      ipAddress: getClientIp(request.headers),
    });

    return Response.json({ ok: true });
  });
}
