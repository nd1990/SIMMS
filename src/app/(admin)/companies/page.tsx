import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { CompaniesClient } from "@/components/admin/companies-client";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canCreate = hasPermission(session.user.role, "companies:manage");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, sites: true, employees: true, reports: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage contracting companies and their operations."
      />
      <CompaniesClient initialData={companies} canCreate={canCreate} />
    </div>
  );
}