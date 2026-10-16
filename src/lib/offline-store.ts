import type { ReportPayload } from "@/lib/report-types";

export type OfflineMeta = {
  testingDate: string;
  switchYardName: string;
  epcBy: string;
  testReportNo: string;
  overallResult: string;
  finalRemarks: string;
};

export type OfflineSave = {
  id: string;
  reportNumber: string;
  testingType: string;
  siteName: string | null;
  companyName: string;
  testedByName: string | null;
  payload: ReportPayload;
  meta: OfflineMeta;
  status: string;
  submit: boolean;
  updatedAt: string;
};

const KEY = "ct-offline-saves";

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function readAll(): OfflineSave[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflineSave[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: OfflineSave[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not save report offline: ${error.message}`
        : "Could not save report offline. Check available device storage."
    );
  }
}

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ct:offline-sync"));
}

export function listOfflineSaves(): OfflineSave[] {
  return readAll().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export function getOfflineSave(reportId: string): OfflineSave | null {
  return readAll().find((s) => s.id === reportId) ?? null;
}

export function pendingOfflineSaves(): number {
  return readAll().length;
}

export function upsertOfflineSave(save: OfflineSave) {
  const list = readAll();
  const index = list.findIndex((s) => s.id === save.id);
  if (index >= 0) list[index] = save;
  else list.push(save);
  writeAll(list);
  notifyChanged();
}

export function removeOfflineSave(reportId: string) {
  writeAll(readAll().filter((s) => s.id !== reportId));
  notifyChanged();
}