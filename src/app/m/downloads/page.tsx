import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MapPin, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { statusLabels } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasPermission } from "@/lib/permissions";
import { withBase } from "@/lib/base-path";
import { PdfIcon } from "@/components/pdf-icon";

export const metadata = { title: "Download Report PDFs" };

export const dynamic = "force-dynamic";

export default async function MobileDownloadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canPdf = hasPermission(session.user.role, "reports:generate_pdf");

  const isTechnician = session.user.role === "TECHNICIAN";
  const where: Record<string, unknown> = isTechnician
    ? { testedById: session.user.employeeId ?? "none" }
    : { companyId: session.user.companyId ?? "none" };

  const reports = canPdf
    ? await prisma.testingReport.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          site: { select: { name: true } },
          testedBy: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Download reports</h1>
        <p className="text-sm text-slate-500">
          {reports.length} report{reports.length === 1 ? "" : "s"} ready as PDF
        </p>
      </div>

      <Link
        href="/m/reports"
        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600"
      >
        Back to my reports <ChevronRight className="h-3.5 w-3.5" />
      </Link>

      {!canPdf ? (
        <EmptyState
          icon={<PdfIcon className="h-10 w-10" />}
          title="PDF download not allowed"
          description="Your role cannot generate report PDFs. Contact your administrator."
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<PdfIcon className="h-10 w-10" />}
          title="No reports to download"
          description="Reports you create or that are assigned to you will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{r.reportNumber}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {r.site?.name ?? "No site"} · {r.testingType.replace(/_/g, " ")}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {r.testedBy?.name ? `${r.testedBy.name} · ` : ""}
                  {r.updatedAt ? formatDate(r.updatedAt) : "—"}
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={r.status} label={statusLabels[r.status]} />
                </div>
              </div>
              <a
                href={withBase(`/api/reports/${r.id}/pdf`)}
                title="Download PDF"
                aria-label={`Download PDF for ${r.reportNumber}`}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-95"
              >
                <PdfIcon className="h-5 w-5" tone="light" />
                PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
