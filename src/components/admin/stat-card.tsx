import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "slate",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  accent?: "sky" | "indigo" | "green" | "amber" | "red" | "slate";
}) {
  const accents: Record<string, string> = {
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    green: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105", accents[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
