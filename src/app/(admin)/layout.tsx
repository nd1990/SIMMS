import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { roleLabel } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Technicians use the mobile app shell.
  if (session.user.role === "TECHNICIAN") {
    redirect("/m/home");
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar userName={session.user.name ?? "User"} userRole={roleLabel(session.user.role)} />
      <main className="pt-14 lg:pl-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}