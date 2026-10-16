import type { Role } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "companies:manage"
  | "projects:manage"
  | "sites:manage"
  | "employees:manage"
  | "users:manage"
  | "reports:view_all"
  | "reports:view_company"
  | "reports:view_own"
  | "reports:edit"
  | "reports:approve"
  | "reports:generate_pdf"
  | "analytics:view"
  | "audit:view"
  | "settings:manage"
  | "test:enter"
  | "test:submit";

const rolePermissions: Record<Role, Permission[]> = {
  MASTER_ADMIN: [
    "dashboard:view",
    "companies:manage",
    "projects:manage",
    "sites:manage",
    "employees:manage",
    "users:manage",
    "reports:view_all",
    "reports:view_company",
    "reports:view_own",
    "reports:edit",
    "reports:approve",
    "reports:generate_pdf",
    "analytics:view",
    "audit:view",
    "settings:manage",
    "test:enter",
    "test:submit",
  ],
  COMPANY_ADMIN: [
    "dashboard:view",
    "projects:manage",
    "sites:manage",
    "employees:manage",
    "reports:view_company",
    "reports:view_own",
    "reports:edit",
    "reports:approve",
    "reports:generate_pdf",
    "analytics:view",
    "test:enter",
    "test:submit",
  ],
  SUPERVISOR: [
    "dashboard:view",
    "reports:view_company",
    "reports:view_own",
    "reports:edit",
    "reports:generate_pdf",
    "test:enter",
    "test:submit",
  ],
  TECHNICIAN: [
    "dashboard:view",
    "reports:view_own",
    "reports:generate_pdf",
    "test:enter",
    "test:submit",
  ],
};

export function hasPermission(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canManageCompany(role: Role | undefined) {
  return hasPermission(role, "companies:manage");
}

export function isAdmin(role: Role | undefined) {
  return role === "MASTER_ADMIN" || role === "COMPANY_ADMIN";
}

export function getHomePath(role: Role | undefined | null) {
  switch (role) {
    case "MASTER_ADMIN":
      return "/dashboard";
    case "COMPANY_ADMIN":
      return "/dashboard";
    case "SUPERVISOR":
      return "/dashboard";
    case "TECHNICIAN":
      return "/m/home";
    default:
      return "/login";
  }
}

export function roleLabel(role: Role | undefined | null) {
  switch (role) {
    case "MASTER_ADMIN":
      return "Master Admin";
    case "COMPANY_ADMIN":
      return "Company Admin";
    case "SUPERVISOR":
      return "Site Engineer";
    case "TECHNICIAN":
      return "Field Technician";
    default:
      return "Unknown";
  }
}
