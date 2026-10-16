"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage, cn } from "@/lib/utils";

type Props = {
  reportId: string;
  reportNumber: string;
  redirectTo?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Render just the trash icon (e.g. inside a table row). */
  iconOnly?: boolean;
  className?: string;
};

export function ReportDeleteButton({
  reportId,
  reportNumber,
  redirectTo,
  label = "Delete",
  variant = "destructive",
  size = "default",
  iconOnly = false,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function onDelete() {
    if (!window.confirm(`Delete report ${reportNumber}? This action cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast("success", "Report deleted");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
      setBusy(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        title={`Delete ${reportNumber}`}
        aria-label={`Delete ${reportNumber}`}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400",
          className
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {busy ? "Deleting…" : label}
      </button>
    );
  }

  return (
    <Button variant={variant} size={size} disabled={busy} onClick={onDelete} className={className}>
      <Trash2 className="h-4 w-4" />
      {busy ? "Deleting…" : label}
    </Button>
  );
}