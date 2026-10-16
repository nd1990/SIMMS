import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function MobileNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const notifications = await prisma.userNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      notification: {
        select: {
          id: true,
          title: true,
          message: true,
          createdAt: true,
          recipients: {
            take: 1,
            select: { report: { select: { id: true, reportNumber: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">Updates on your reports.</p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="Nothing here yet"
          description="Status updates for your test reports will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const report = n.notification.recipients[0]?.report;
            return (
              <Link
                key={n.id}
                href={report ? `/m/reports/${report.id}` : "#"}
                className={`block rounded-2xl border p-4 shadow-sm transition active:scale-[0.99] ${
                  n.read ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${n.read ? "text-slate-700" : "text-slate-900"}`}>
                      {n.notification.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{n.notification.message}</p>
                    {report && (
                      <span className="mt-1 inline-block text-xs font-semibold text-sky-600">
                        {report.reportNumber} →
                      </span>
                    )}
                  </div>
                  {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500 ring-4 ring-sky-100" />}
                </div>
                <p className="mt-2 text-xs text-slate-400">{formatDate(n.notification.createdAt)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}