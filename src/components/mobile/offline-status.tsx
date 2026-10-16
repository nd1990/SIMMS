"use client";

import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { pendingOfflineSaves } from "@/lib/offline-store";

function useOfflineCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => setCount(pendingOfflineSaves());
    refresh();
    window.addEventListener("ct:offline-sync", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("ct:offline-sync", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return count;
}

export function OfflineSavesCard() {
  const count = useOfflineCount();
  if (!count) return null;
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
        <CloudUpload className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{count}</p>
      <p className="text-xs font-medium text-slate-500">Report{count > 1 ? "s" : ""} saved offline</p>
      <p className="mt-1 text-xs text-sky-700">Will auto-sync when you are back online.</p>
    </div>
  );
}

export function OfflineSavesBanner() {
  const count = useOfflineCount();
  if (!count) return null;
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      <span className="font-semibold">
        {count} report{count > 1 ? "s" : ""} saved offline
      </span>{" "}
      — stored on this device and syncing automatically once the internet is back.
    </div>
  );
}