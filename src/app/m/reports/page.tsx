import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText, MapPin, ChevronRight, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { statusLabels } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermission } from "@/lib/permissions";
import { withBase } from "@/lib/base-path";
import { PdfIcon } from "@/components/pdf-icon";

export const metadata = { title: "My Reports" };

export const dynamic = "force-dynamic";

const EDITABLE = ["DRAFT", "SUBMITTED", "REJECTED", "CORRECTION_REQUESTED"];
const ACTIVE = ["SUBMITTED"];
const CLOSED = ["APPROVED", "GENERATED"];

export default async function MobileReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { tab } = await searchParams;

  const isTechnician = session.user.role === "TECHNICIAN";
  const where: Record<string, unknown> = isTechnician
    ? { testedById: session.user.employeeId ?? "none" }
    : { companyId: session.user.companyId ?? "none" };

  const statusIn =
    tab === "editable"
      ? EDITABLE
      : tab === "active"
      ? ACTIVE
      : tab === "closed"
      ? CLOSED
      : undefined;
  if (statusIn) where.status = { in: statusIn };

  const reports = await prisma.testingReport.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      site: { select: { name: true } },
      company: { select: { name: true } },
      testedBy: { select: { name: true } },
    },
  });

  const canPdf = hasPermission(session.user.role, "reports:generate_pdf");

  const tabs = [
    { key: "all", label: "All", active: !tab || tab === "all" },
    { key: "editable", label: "In progress", active: tab === "editable" },
    { key: "active", label: "Submitted", active: tab === "active" },
    { key: "closed", label: "Finished", active: tab === "closed" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {isTechnician ? "My reports" : "Company reports"}
        </h1>
        <p className="text-sm text-slate-500">{reports.length} report{reports.length === 1 ? "" : "s"}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/m/reports" : `/m/reports?tab=${t.key}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              t.active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No reports here"
          description="Reports you create or that are assigned to you will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => {
            const editable = EDITABLE.includes(r.status);
            return (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
              >
                <Link href={`/m/reports/${r.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={
                      editable
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                    }
                  >
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.reportNumber}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {r.site?.name ?? "No site"} · {r.testingType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {editable ? "Tap to view report" : `Tested by ${r.testedBy?.name ?? "—"}`} ·{" "}
                      {r.updatedAt ? formatDate(r.updatedAt) : "—"}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={r.status} label={statusLabels[r.status]} />
                    </div>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {editable ? (
                    <a
                      href={withBase(`/m/reports/${r.id}/edit`)}
                      aria-label={`Edit ${r.reportNumber}`}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition active:scale-95"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </a>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
                      View <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                  {canPdf && (
                    <a
                      href={withBase(`/api/reports/${r.id}/pdf`)}
                      title="Download PDF"
                      aria-label={`Download PDF for ${r.reportNumber}`}
                      className="grid h-11 w-11 place-items-center rounded-xl bg-white ring-1 ring-slate-200 transition active:scale-95"
                    >
                      <PdfIcon className="h-6 w-6" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}