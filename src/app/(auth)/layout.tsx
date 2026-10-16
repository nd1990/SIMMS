import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomePath } from "@/lib/permissions";
import { ClipboardCheck, FileText, MonitorSmartphone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const brandPoints = [
  {
    icon: ClipboardCheck,
    title: "Streamlined testing",
    desc: "Track CT testing through report submission.",
  },
  {
    icon: FileText,
    title: "Professional reports",
    desc: "Auto-generated 66 KV CT testing reports you can trust.",
  },
  {
    icon: MonitorSmartphone,
    title: "Works in the field",
    desc: "Offline drafts on mobile with instant sync back to the office.",
  },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(getHomePath(session.user.role));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-white via-sky-50 to-teal-50 lg:flex dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,91,145,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(20,159,147,0.16),transparent_55%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 drop-shadow-sm" />
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white">CT Testing</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Management System</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Industrial CT testing, made simple.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              66 KV Current Transformer testing and reporting for your entire team — from the
              switchyard to your submitted report data.
            </p>

            <ul className="mt-10 space-y-6">
              {brandPoints.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-white/10">
                      <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{p.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} CT Testing Management</p>
        </div>
      </aside>

      {/* Form pane */}
      <main className="flex w-full flex-1 flex-col overflow-y-auto px-4 py-10 sm:px-8 lg:items-center lg:justify-center lg:px-12">
        <div className="m-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}