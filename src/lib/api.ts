import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function apiUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function requireApiUser() {
  const user = await apiUser();
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return user;
}

// Route handler context type (params are a Promise in App Router).
export type RouteContext = {
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function requireApiPermission(permission: Permission) {
  const user = await apiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(user.role, permission)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return user as NonNullable<Awaited<ReturnType<typeof apiUser>>> & { user?: never };
}

// Scope helper: restrict queries for company admins/supervisors to their company.
export function scopeWhere(user: { role: string; companyId?: string | null }) {
  if (user.role === "MASTER_ADMIN") return {};
  return user.companyId ? { companyId: user.companyId } : { companyId: "none" };
}

export async function canManageCompanyData(user: { role: string } | null) {
  if (!user) return false;
  return user.role === "MASTER_ADMIN" || user.role === "COMPANY_ADMIN";
}

export function apiError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

export function getPrisma() {
  return prisma;
}