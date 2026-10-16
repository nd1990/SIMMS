import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportDeleteButton } from "@/components/admin/report-delete-button";
import { PdfIcon } from "@/components/pdf-icon";
import { FileText, Eye, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { statusLabels } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Test Reports" };

const FILTERS = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CORRECTION_REQUESTED", "GENERATED"] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { status } = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(status ?? "ALL") ? (status as string) ?? "ALL" : "ALL";

  const where: Record<string, unknown> = {};
  if (filter !== "ALL") where.status = filter;
  if (session.user.role !== "MASTER_ADMIN") {
    where.companyId = session.user.companyId ?? "none";
  }

  const reports = await prisma.testingReport.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { name: true } },
      site: { select: { name: true } },
      testedBy: { select: { name: true } },
      _count: { select: { approvals: true, attachments: true } },
    },
  });

  const canEdit =
    hasPermission(session.user.role, "reports:edit") || session.user.role === "MASTER_ADMIN";
  const canDelete =
    session.user.role === "MASTER_ADMIN" || session.user.role === "COMPANY_ADMIN";
  const canPdf = hasPermission(session.user.role, "reports:generate_pdf");

  return (
    <div className="space-y-6">
      <PageHeader title="Test Reports" description="Browse and manage CT testing reports across sites." />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/reports" : `/reports?status=${f}`}
            className={
              filter === f
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
            }
          >
            {f.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No reports found"
          description="Reports will appear here once technicians create and submit testing data."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Date</th>
                <th className="hidden px-4 py-3 md:table-cell">Site / Company</th>
                <th className="hidden px-4 py-3 lg:table-cell">Tested by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{r.reportNumber}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{r.testingType.replace(/_/g, " ")}</p>
                  </td>
                  <td className="px-4 py-3">{r.testingDate ? formatDate(r.testingDate) : "—"}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="text-slate-700">{r.site?.name ?? "—"}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{r.company.name}</p>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">{r.testedBy?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} label={statusLabels[r.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {canEdit && (
                        <Link
                          href={`/reports/${r.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      )}
                      <Link
                        href={`/reports/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      {canPdf && (
                        <a
                          href={withBase(`/api/reports/${r.id}/pdf`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          <PdfIcon className="h-4 w-4" />
                          PDF
                        </a>
                      )}
                      {canDelete && (
                        <ReportDeleteButton
                          reportId={r.id}
                          reportNumber={r.reportNumber}
                          iconOnly
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}