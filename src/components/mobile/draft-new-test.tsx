"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { TESTING_TYPES } from "@/lib/constants";
import type { ReactNode } from "react";

type Site = { id: string; name: string };

// Deep links like /m/drafts?new=CB_66KV create that draft and open it straight
// away — no chooser sheet in the middle.
export function DraftNewTest({ sites, children }: { sites: Site[]; children?: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const newType = searchParams.get("new");
  const started = useRef(false);
  const [busy, setBusy] = useState(Boolean(newType));
  const { toast } = useToast();

  useEffect(() => {
    if (!newType || started.current) return;
    started.current = true;
    setBusy(true);

    const label = TESTING_TYPES.find((t) => t.value === newType)?.label ?? newType;

    (async () => {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateCode: newType, siteId: sites[0]?.id ?? null }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.data?.id) throw new Error(json.error ?? `Could not start ${label}`);
        window.location.replace(withBase(`/m/reports/${json.data.id}/edit`));
      } catch (e) {
        const message = getErrorMessage(e);
        toast("error", message);
        setBusy(false);
        router.replace("/m/drafts");
      }
    })();
  }, [newType, router, sites, toast]);

  return (
    <>
      {children}
      {busy && newType ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            <p className="text-sm font-semibold text-slate-800">
              Starting {TESTING_TYPES.find((t) => t.value === newType)?.label ?? "test"}…
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
