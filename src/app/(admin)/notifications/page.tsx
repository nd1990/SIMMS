import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
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
            select: {
              report: { select: { id: true, reportNumber: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Updates about your reports." />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No notifications yet"
          description="Report updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const report = n.notification.recipients[0]?.report;
            return (
              <div
                key={n.id}
                className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900 ${n.read ? "border-slate-200 dark:border-slate-800" : "border-sky-300 dark:border-sky-600"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${n.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                      {n.notification.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.notification.message}</p>
                    {report && (
                      <Link
                        href={`/reports/${report.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {report.reportNumber}
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" title="Unread" />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">{formatDate(n.notification.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}