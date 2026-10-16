"use client";

import { useEffect } from "react";
import { isOnline, listOfflineSaves, removeOfflineSave } from "@/lib/offline-store";
import type { OfflineSave } from "@/lib/offline-store";

async function syncOne(save: OfflineSave) {
  const headers = { "Content-Type": "application/json" };

  if (["REJECTED", "CORRECTION_REQUESTED"].includes(save.status)) {
    const reopen = await fetch(`/api/reports/${save.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "reopen" }),
    });
    if (reopen.status === 404) throw new Error("gone");
    if (!reopen.ok) {
      const j = await reopen.json().catch(() => null);
      throw new Error(j?.error ?? "reopen failed");
    }
  }

  const putRes = await fetch(`/api/reports/${save.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      payload: save.payload,
      switchYardName: save.meta.switchYardName || undefined,
      testingDate: save.meta.testingDate || undefined,
    }),
  });
  const putJson = await putRes.json().catch(() => null);
  if (putRes.status === 404) throw new Error("gone");
  if (!putRes.ok) throw new Error(putJson?.error ?? "save failed");

  const metaRes = await fetch(`/api/reports/${save.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      action: "meta",
      overallResult: save.meta.overallResult,
      finalRemarks: save.meta.finalRemarks,
      epcBy: save.meta.epcBy,
      testReportNo: save.meta.testReportNo,
      switchYardName: save.meta.switchYardName,
      testingDate: save.meta.testingDate,
    }),
  });
  if (metaRes.status === 404) throw new Error("gone");
  if (!metaRes.ok) {
    const m = await metaRes.json().catch(() => null);
    throw new Error(m?.error ?? "report details save failed");
  }

  if (save.submit) {
    const subRes = await fetch(`/api/reports/${save.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "submit" }),
    });
    if (subRes.status === 404) throw new Error("gone");
    if (!subRes.ok) {
      const j = await subRes.json().catch(() => null);
      throw new Error(j?.error ?? "submit failed");
    }
  }
}

export function OfflineSync() {
  useEffect(() => {
    let running = false;

    async function syncAll() {
      if (running || !isOnline()) return;
      const saves = listOfflineSaves();
      if (!saves.length) return;
      running = true;
      for (const save of saves) {
        try {
          await syncOne(save);
          removeOfflineSave(save.id);
        } catch (e) {
          const networkDown = e instanceof TypeError || !isOnline();
          if (networkDown) break;
        }
      }
      running = false;
    }

    const onOnline = () => void syncAll();
    const onFocus = () => void syncAll();
    const onCustom = () => void syncAll();
    const t0 = window.setTimeout(onCustom, 800);
    const interval = window.setInterval(onOnline, 60000);

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    window.addEventListener("ct:offline-sync", onCustom);

    return () => {
      window.clearTimeout(t0);
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("ct:offline-sync", onCustom);
    };
  }, []);

  return null;
}