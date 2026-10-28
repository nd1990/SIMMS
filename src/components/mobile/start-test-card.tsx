"use client";

import { useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import { withBase } from "@/lib/base-path";

// Tapping a test card creates that draft and goes straight to the form —
// no chooser dialog in between.
export function StartTestCard({
  templateCode,
  siteId,
  className,
  children,
  label,
}: {
  templateCode: string;
  siteId?: string | null;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode, siteId: siteId || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data?.id) throw new Error(json.error ?? "Could not start this test");
      window.location.href = withBase(`/m/reports/${json.data.id}/edit`);
    } catch (e) {
      toast("error", getErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      aria-busy={busy}
      aria-label={label ? `Start ${label}` : undefined}
      className={`relative text-left disabled:opacity-70 ${className ?? ""}`}
    >
      {children}
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/85 text-xs font-semibold text-slate-700 backdrop-blur-[1px]">
          Opening…
        </span>
      ) : null}
    </button>
  );
}
