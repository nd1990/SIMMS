import { prisma } from "@/lib/prisma";

type AuditParams = {
  userId?: string | null;
  userName?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
};

export async function auditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName ?? null,
        action: params.action,
        module: params.module,
        recordId: params.recordId ?? null,
        oldValue:
          params.oldValue !== undefined ? JSON.parse(JSON.stringify(params.oldValue)) : null,
        newValue:
          params.newValue !== undefined ? JSON.parse(JSON.stringify(params.newValue)) : null,
        ipAddress: params.ipAddress ?? null,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    console.error("Audit log write failed", err);
  }
}

export function getClientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip");
}
