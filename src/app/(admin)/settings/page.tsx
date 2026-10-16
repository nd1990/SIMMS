import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Settings as SettingsIcon } from "lucide-react";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user.role, "settings:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <EmptyState
          icon={<SettingsIcon className="h-10 w-10" />}
          title="Access restricted"
          description="Settings are managed by system administrators."
        />
      </div>
    );
  }

  const [account, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true },
    }),
    session.user.companyId
      ? prisma.company.findUnique({
          where: { id: session.user.companyId },
          select: {
            name: true,
            code: true,
            address: true,
            contactPerson: true,
            contactNumber: true,
            email: true,
            gstNumber: true,
          },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account security and organisation profile." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">My account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{account?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{account?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Member since</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{account ? formatDate(account.createdAt) : "—"}</dd>
            </div>
          </dl>
        </div>

        {company && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Organisation</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{company.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Code</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{company.code}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Contact</dt>
                <dd className="text-right text-slate-700">
                  {company.contactPerson ?? "—"}
                  {company.contactNumber ? <span className="block text-xs text-slate-400">{company.contactNumber}</span> : null}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{company.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">GST</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{company.gstNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Address</dt>
                <dd className="text-right text-slate-700">{company.address ?? "—"}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Change password</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">Use a strong password you do not use elsewhere.</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}