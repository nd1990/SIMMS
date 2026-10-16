import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { EmployeesClient } from "@/components/admin/employees-client";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = hasPermission(session.user.role, "employees:manage");
  const canCreateLogin = hasPermission(session.user.role, "users:manage");
  const companyFilter = session.user.companyId ?? undefined;

  const [employees, companies] = await Promise.all([
    prisma.employee
      .findMany({
        where: companyFilter ? { companyId: companyFilter } : {},
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true } },
          user: { select: { id: true, status: true } },
        },
      })
      .then((rows) =>
        rows.map((e) => ({ ...e, joiningDate: e.joiningDate ? e.joiningDate.toISOString() : null }))
      ),
    prisma.company.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage engineers and technicians in your organisation." />
      <EmployeesClient initialData={employees} companies={companies} canManage={canManage} canCreateLogin={canCreateLogin} />
    </div>
  );
}