import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { ProjectReportsClient } from "@/components/admin/project-reports-client";
import { Sidebar } from "@/components/admin/sidebar";
import { roleLabel } from "@/lib/permissions";

export const metadata = { title: "Project Reports" };

export default async function ProjectReportsPageAlt({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "TECHNICIAN") redirect("/m/home");

  const { id } = await params;

  const canManage = hasPermission(session.user.role, "projects:manage");
  const companyFilter = session.user.companyId ?? undefined;

  const project = await prisma.project.findFirst({
    where: companyFilter ? { id, companyId: companyFilter } : { id },
    include: { company: { select: { name: true, code: true } } },
  });
  if (!project) redirect("/admin/projects");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar userName={session.user.name ?? "User"} userRole={roleLabel(session.user.role)} />
      <main className="pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="space-y-6">
            <PageHeader
              title="Project Reports"
              description={`${project.name} (${project.code}) • ${project.company.name}`}
            />
            <ProjectReportsClient projectId={project.id} projectName={project.name} canManage={canManage} />
          </div>
        </div>
      </main>
    </div>
  );
}
