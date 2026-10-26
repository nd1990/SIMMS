import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MobileNav } from "@/components/mobile/mobile-nav";
import { OfflineSync } from "@/components/mobile/offline-sync";

export const viewport = { themeColor: "#005b91" };

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const unread = await prisma.userNotification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <OfflineSync />
      <MobileNav unread={unread} />
      <main className="mx-auto max-w-xl p-4 pb-6 md:max-w-3xl">{children}</main>
    </div>
  );
}