import { prisma } from "@/lib/prisma";

export async function notifyUser({
  userId,
  title,
  message,
  reportId,
}: {
  userId: string;
  title: string;
  message: string;
  reportId?: string;
}) {
  const notification = await prisma.notification.create({
    data: { title, message, type: reportId ? "REPORT" : "SYSTEM" },
  });

  await prisma.userNotification.create({
    data: {
      userId,
      notificationId: notification.id,
      read: false,
    },
  });

  if (reportId) {
    await prisma.reportNotification.create({
      data: {
        userId,
        reportId,
        notificationId: notification.id,
      },
    });
  }

  return notification;
}

export async function notifyApprovers({
  title,
  message,
  companyId,
  reportId,
  excludeUserId,
}: {
  title: string;
  message: string;
  companyId: string;
  reportId: string;
  excludeUserId: string;
}) {
  const approvers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["MASTER_ADMIN", "COMPANY_ADMIN", "SUPERVISOR"] },
      OR: [{ role: "MASTER_ADMIN" }, { companyId }],
      NOT: { id: excludeUserId },
    },
    select: { id: true },
  });

  for (const approver of approvers) {
    await notifyUser({ userId: approver.id, title, message, reportId });
  }
}

export async function notifyTester({
  title,
  message,
  report,
}: {
  title: string;
  message: string;
  report: { id: string; testedById: string | null };
}) {
  if (!report.testedById) return;
  const account = await prisma.user.findFirst({
    where: { employeeId: report.testedById, status: "ACTIVE" },
    select: { id: true },
  });
  if (!account) return;
  await notifyUser({ userId: account.id, title, message, reportId: report.id });
}