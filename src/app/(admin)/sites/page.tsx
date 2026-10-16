import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { SitesClient } from "@/components/admin/sites-client";

export const metadata = { title: "Sites" };

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = hasPermission(session.user.role, "sites:manage");
  const companyFilter = session.user.companyId ?? undefined;

  const [sites, companies, projects] = await Promise.all([
    prisma.site.findMany({
      where: companyFilter ? { companyId: companyFilter } : {},
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        project: { select: { name: true } },
        _count: { select: { reports: true } },
      },
    }),
    prisma.company.findMany({ where: { status: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      where: companyFilter ? { companyId: companyFilter } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Sites" description="Manage test sites across substations and switchyards." />
      <SitesClient initialData={sites} companies={companies} projects={projects} canManage={canManage} />
    </div>
  );
}