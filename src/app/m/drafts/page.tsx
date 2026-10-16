import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileEdit, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { statusLabels } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OfflineSavesBanner } from "@/components/mobile/offline-status";
import { DraftNewTest } from "@/components/mobile/draft-new-test";

export const dynamic = "force-dynamic";

export default async function MobileDraftsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [drafts, sites] = await Promise.all([
    prisma.testingReport.findMany({
      where: {
        testedById: session.user.employeeId ?? "none",
        status: { in: ["DRAFT", "REJECTED", "CORRECTION_REQUESTED"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        site: { select: { name: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.site.findMany({
      where: session.user.companyId ? { companyId: session.user.companyId } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <DraftNewTest
      sites={sites.map((s) => ({ id: s.id, name: s.name }))}
    >
      <div className="space-y-5">
        <header>
          <h1 className="text-lg font-semibold text-slate-900">My drafts</h1>
          <p className="text-sm text-slate-500">Reports you are currently filling in</p>
        </header>

        <OfflineSavesBanner />

        {drafts.length === 0 ? (
          <EmptyState
            icon={<FileEdit className="h-10 w-10" />}
            title="No drafts"
            description="Start a new test from Home."
          />
        ) : (
          <div className="space-y-2.5">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/m/reports/${d.id}/edit`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        d.status === "REJECTED" || d.status === "CORRECTION_REQUESTED"
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"
                      }
                    >
                      <FileEdit className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{d.reportNumber}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {d.site?.name ?? "No site"} · {d.testingType.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Updated {d.updatedAt ? formatDate(d.updatedAt.toString()) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge
                      status={d.status}
                      label={
                        d.status === "REJECTED" || d.status === "CORRECTION_REQUESTED"
                          ? "Needs correction"
                          : statusLabels[d.status]
                      }
                    />
                    <span
                      className={
                        d.status === "REJECTED" || d.status === "CORRECTION_REQUESTED"
                          ? "flex items-center gap-0.5 text-[11px] font-semibold text-amber-600"
                          : "flex items-center gap-0.5 text-[11px] font-semibold text-sky-600"
                      }
                    >
                      Continue <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DraftNewTest>
  );
}