"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { TESTING_TYPES } from "@/lib/constants";

type Site = { id: string; name: string };

export function NewTestSheet({
  open,
  onClose,
  initialType,
  sites,
}: {
  open: boolean;
  onClose: () => void;
  initialType?: string;
  sites: Site[];
}) {
  const [testingType, setTestingType] = useState<string>(initialType && TESTING_TYPES.some((t) => t.value === initialType) ? initialType : TESTING_TYPES[0].value);
  const [siteId, setSiteId] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const availableSites = sites;

  async function createReport() {
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode: testingType, siteId: siteId || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", "Draft created — start testing");
      window.location.href = withBase(`/m/reports/${json.data.id}/edit`);
    } catch (e) {
      toast("error", getErrorMessage(e));
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Start a new test</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose the type and site, then fill the readings.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!availableSites.length && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No sites are available yet. Ask an admin to create a site.
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-type">Testing type</Label>
            <Select id="nt-type" value={testingType} onChange={(e) => setTestingType(e.target.value)}>
              {TESTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          {availableSites.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="nt-site">Site</Label>
              <Select
                id="nt-site"
                value={siteId || availableSites[0]?.id}
                onChange={(e) => setSiteId(e.target.value)}
              >
                {availableSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={busy || !availableSites.length} onClick={createReport}>
              {busy ? "Creating…" : (
                <span className="inline-flex items-center gap-1">
                  Create draft <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}