import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { ProjectsClient } from "@/components/admin/projects-client";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = hasPermission(session.user.role, "projects:manage");
  const companyFilter = session.user.companyId ?? undefined;

  const [projects, companies] = await Promise.all([
    prisma.project.findMany({
      where: companyFilter ? { companyId: companyFilter } : {},
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true, code: true } },
        _count: { select: { sites: true, reports: true } },
      },
    }),
    prisma.company.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Group test sites under commissioning projects." />
      <ProjectsClient initialData={projects} companies={companies} canManage={canManage} />
    </div>
  );
}