import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersClient } from "@/components/admin/users-client";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Users & Roles" };

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user.role, "users:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & Roles" />
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10" />}
          title="Access restricted"
          description="Only the Master Admin can manage users and roles."
        />
      </div>
    );
  }

  const [users, companies, employees] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "MASTER_ADMIN" }, ...(session.user.role === "COMPANY_ADMIN" ? { companyId: session.user.companyId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        employee: { select: { name: true, code: true } },
      },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({
      where: session.user.role === "COMPANY_ADMIN" ? { companyId: session.user.companyId ?? "none" } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description="Create login accounts and link them to employees."
      />
      <UsersClient
        initialData={users.map(({ passwordHash: _pw, createdAt, ...u }) => ({
          ...u,
          createdAt: (createdAt as Date).toISOString(),
        }))}
        companies={companies}
        employees={employees}
      />
    </div>
  );
}