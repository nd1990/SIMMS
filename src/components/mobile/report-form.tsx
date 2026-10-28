"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FileCheck2,
  Pencil,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ReportSections } from "@/components/admin/report-sections";
import { PowerTrForm, SHEET_TABS, type SheetId } from "@/components/mobile/power-tr-form";
import { CbForm, MctForm, PctForm, PtForm } from "@/components/mobile/equipment-forms";
import { PdfIcon } from "@/components/pdf-icon";
import { getErrorMessage } from "@/lib/utils";
import {
  POWER_TR_TEMPLATE_CODE,
  validatePowerTrData,
} from "@/lib/power-tr-types";
import {
  CB_TEMPLATE_CODE,
  MCT_TEMPLATE_CODE,
  MPT_TEMPLATE_CODE,
  PCT_TEMPLATE_CODE,
  PPT_TEMPLATE_CODE,
  buildPtDefaultPayload,
  normalizePtData,
  validateCbData,
  validateMctData,
  validatePctData,
  type PtData,
} from "@/lib/equipment-types";
import {
  getOfflineSave,
  isOnline,
  removeOfflineSave,
  upsertOfflineSave,
} from "@/lib/offline-store";
import {
  ReportPayload,
  ChecklistRow,
} from "@/lib/report-types";
import {
  KNEE_POINT_STEPS,
  WINDING_CONNECTIONS,
  PHASES,
} from "@/lib/constants";

type Meta = {
  testingDate: string;
  switchYardName: string;
  epcBy: string;
  testReportNo: string;
  overallResult: string;
  finalRemarks: string;
};

async function readApiResponse(response: Response, fallback: string) {
  const text = await response.text();
  let body: { error?: string } | null = null;

  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        body = parsed as { error?: string };
      } else if (parsed && typeof parsed === "object") {
        body = {};
      }
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw new Error(body?.error ?? `${fallback} (HTTP ${response.status})`);
  }
  if (!body) {
    throw new Error(`${fallback}: server returned an empty or invalid response (HTTP ${response.status})`);
  }
  return body;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function PdfDownload({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99]"
    >
      <PdfIcon className="h-5 w-5" tone="light" />
      Download PDF
    </a>
  );
}



export function ReportForm({
  report,
  initialPayload,
  initialMeta,
  canEdit,
  canSubmit,
  status,
  returnTo,
  pdfHref,
  editHref,
  backHref,
}: {
  report: {
    id: string;
    reportNumber: string;
    testingType: string;
    siteName: string | null;
    companyName: string;
    testedByName: string | null;
  };
  initialPayload: ReportPayload;
  initialMeta?: Partial<Meta>;
  canEdit: boolean;
  canSubmit: boolean;
  status: string;
  returnTo?: string;
  pdfHref?: string | null;
  editHref?: string | null;
  backHref?: string | null;
}) {
  const [payload, setPayload] = useState<ReportPayload>(initialPayload);
  const [meta, setMeta] = useState<Meta>({
    testingDate: new Date().toISOString().slice(0, 10),
    switchYardName: "",
    epcBy: "",
    testReportNo: "",
    overallResult: "",
    finalRemarks: "",
    ...initialMeta,
  });
  useEffect(() => {
    const saved = getOfflineSave(report.id);
    if (!saved) return;
    const timer = window.setTimeout(() => {
      setPayload(saved.payload);
      setMeta(saved.meta);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [report.id]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const isTemplate1 = payload.templateCode === "66KV_CT";
  const isPowerTr = payload.templateCode === POWER_TR_TEMPLATE_CODE;
  const isPt = payload.templateCode === MPT_TEMPLATE_CODE || payload.templateCode === PPT_TEMPLATE_CODE;
  const isCb = payload.templateCode === CB_TEMPLATE_CODE;
  const isMct = payload.templateCode === MCT_TEMPLATE_CODE;
  const isPct = payload.templateCode === PCT_TEMPLATE_CODE;
  const isEquipment = isCb || isMct || isPct || isPt;
  const templateLabel = isPowerTr
    ? "Power Transformer Testing Report"
    : isCb
    ? "66 KV CB Testing Report"
    : isMct
    ? "66 KV MCT Testing Report"
    : isPct
    ? "66 KV PCT Testing Report"
    : isPt
    ? payload.templateCode === PPT_TEMPLATE_CODE
      ? "66 KV BUS PT Testing Report"
      : "66 KV METERING PT Testing Report"
    : "CT Testing Report";
  const editable = canEdit;

  // Power Transformer multi-sheet navigation. The active tab lives here so the
  // footer can show "Save & Next" on every sheet and only reveal "Submit" once
  // the user reaches the final (Signatures) sheet.
  const [powerTrTab, setPowerTrTab] = useState<SheetId>("ratio");
  const tabIdx = SHEET_TABS.findIndex((t) => t.id === powerTrTab);
  const isLastSheet = tabIdx === SHEET_TABS.length - 1;

  function setPayloadSection<K extends keyof ReportPayload>(key: K, value: ReportPayload[K]) {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }

  function rows<K extends keyof ReportPayload>(key: K): any[] {
    return (payload[key] as any[]) ?? [];
  }

  function toggle(sec: string) {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  }

  async function persistAndSubmit(submit: boolean, afterSave?: () => void) {
    setBusy(submit ? "submit" : "save");
    try {
      // Validate the Power Transformer report before submitting so an incomplete
      // sheet is never sent for approval.
      if (submit && isPowerTr && payload.powerTr) {
        const problems = validatePowerTrData(payload.powerTr);
        if (problems.length > 0) {
          toast("error", problems.slice(0, 3).join(" "));
          setBusy(null);
          return;
        }
      }

      if (submit) {
        const problems = isCb && payload.cb
          ? validateCbData(payload.cb)
          : isMct && payload.mct
          ? validateMctData(payload.mct)
          : isPct && payload.pct
          ? validatePctData(payload.pct)
          : [];
        if (problems.length > 0) {
          toast("error", problems.slice(0, 3).join(" "));
          setBusy(null);
          return;
        }
      }

      // Reopen report if it is in a rejected/correction state.
      if (["REJECTED", "CORRECTION_REQUESTED"].includes(status)) {
        const reopen = await fetch(`/api/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reopen" }),
        });
        await readApiResponse(reopen, "Could not reopen report");
      }

      const saveRes = await fetch(`/api/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          switchYardName: meta.switchYardName || undefined,
          testingDate: meta.testingDate || undefined,
        }),
      });
      await readApiResponse(saveRes, "Save failed");

      const metaRes = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "meta",
          overallResult: meta.overallResult,
          finalRemarks: meta.finalRemarks,
          epcBy: meta.epcBy,
          testReportNo: meta.testReportNo,
          switchYardName: meta.switchYardName,
          testingDate: meta.testingDate,
        }),
      });
      await readApiResponse(metaRes, "Could not save report details");

      if (submit) {
        const subRes = await fetch(`/api/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        await readApiResponse(subRes, "Submit failed");
        removeOfflineSave(report.id);
        toast("success", "Report submitted and saved");
        router.push(returnTo || "/m/reports");
        router.refresh();
      } else {
        removeOfflineSave(report.id);
        toast("success", status === "SUBMITTED" ? "Changes saved" : "Draft saved");
        router.refresh();
        afterSave?.();
      }
    } catch (e) {
      if (!isOnline() || e instanceof TypeError) {
        try {
          upsertOfflineSave({
            id: report.id,
            reportNumber: report.reportNumber,
            testingType: report.testingType,
            siteName: report.siteName,
            companyName: report.companyName,
            testedByName: report.testedByName,
            payload,
            meta: { ...meta },
            status,
            submit,
            updatedAt: new Date().toISOString(),
          });
          toast(
            "success",
            submit
              ? "Saved offline — will submit automatically when you are back online"
              : "Saved offline — will sync automatically when you are back online"
          );
        } catch (storageError) {
          toast("error", getErrorMessage(storageError));
        }
      } else {
        toast("error", getErrorMessage(e));
      }
    } finally {
      setBusy(null);
    }
  }

  function saveAndNextSheet() {
    const next = SHEET_TABS[tabIdx + 1];
    if (!next) return;
    persistAndSubmit(false, () => setPowerTrTab(next.id));
  }

  if (!editable) {
    const readOnlyMeta: [string, string | undefined][] = [
      ["Test date", meta.testingDate],
      ["Switchyard", meta.switchYardName],
      ["EPC / Contractor", meta.epcBy],
      ["Client report no.", meta.testReportNo],
    ];
    return (
      <div className="space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
          <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-300">Report</p>
            <h1 className="mt-0.5 text-lg font-bold">{report.reportNumber}</h1>
            <p className="mt-1 text-xs text-slate-300">{report.siteName ?? "No site"} · {report.testingType.replace(/_/g, " ")}</p>
            <p className="mt-2 text-xs text-slate-300">Status: {status.replace(/_/g, " ")} · Tested by {report.testedByName ?? "—"}</p>
          </div>
        </header>

        {(editHref || pdfHref) && (
          <div className={editHref && pdfHref ? "grid grid-cols-2 gap-2" : ""}>
            {editHref && (
              <a
                href={editHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.99]"
              >
                <Pencil className="h-4 w-4" />
                Edit report
              </a>
            )}
            {pdfHref && <PdfDownload href={pdfHref} />}
          </div>
        )}

        {["APPROVED", "GENERATED"].includes(status) && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            This report has been finalized and is read-only.
          </p>
        )}

        {status === "SUBMITTED" && (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            This report has been submitted for approval.
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="space-y-2 text-sm">
            {readOnlyMeta.map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-900">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Recorded test data</h2>
          <ReportSections payload={payload} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {backHref && (
        <a
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 transition active:opacity-70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to report
        </a>
      )}
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300">
            {templateLabel}
          </p>
          <h1 className="mt-0.5 text-lg font-bold">{report.reportNumber}</h1>
          <p className="mt-1 text-xs text-slate-300">{report.siteName ?? "No site"} · {report.testingType.replace(/_/g, " ")}</p>
          <p className="mt-1 text-xs text-slate-300">Tested by {report.testedByName ?? "You"}</p>
        </div>
      </header>

      {pdfHref && <PdfDownload href={pdfHref} />}

      <Section title="Test details" subtitle="Site metadata and summary fields">
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Test date">
            <Input type="date" value={meta.testingDate} onChange={(e) => setMeta((m) => ({ ...m, testingDate: e.target.value }))} />
          </Field>
          <Field label="Switchyard">
            <Input value={meta.switchYardName} onChange={(e) => setMeta((m) => ({ ...m, switchYardName: e.target.value }))} placeholder="400kV S/S" />
          </Field>
          <Field label="EPC / Contractor">
            <Input value={meta.epcBy} onChange={(e) => setMeta((m) => ({ ...m, epcBy: e.target.value }))} />
          </Field>
          <Field label="Client report no.">
            <Input value={meta.testReportNo} onChange={(e) => setMeta((m) => ({ ...m, testReportNo: e.target.value }))} />
          </Field>
        </div>
      </Section>

      {isTemplate1 ? (
        <Template1Checklist
          rows={rows("checklist")}
          onRows={(v) => setPayloadSection("checklist", v)}
          reportId={report.id}
        />
      ) : isPowerTr ? (
        <PowerTrForm
          data={payload.powerTr!}
          onChange={(d) => setPayloadSection("powerTr", d)}
          tab={powerTrTab}
          onTabChange={setPowerTrTab}
        />
      ) : isCb && payload.cb ? (
        <CbForm data={payload.cb} onChange={(d) => setPayloadSection("cb", d)} />
      ) : isMct && payload.mct ? (
        <MctForm data={payload.mct} onChange={(d) => setPayloadSection("mct", d)} />
      ) : isPct && payload.pct ? (
        <PctForm data={payload.pct} onChange={(d) => setPayloadSection("pct", d)} />
      ) : isPt && (payload.mpt || payload.ppt) ? (
        <PtForm
          data={(payload.mpt || payload.ppt) as PtData}
          isBus={payload.templateCode === PPT_TEMPLATE_CODE}
          onChange={(d) =>
            setPayloadSection(payload.templateCode === PPT_TEMPLATE_CODE ? "ppt" : "mpt", d)
          }
        />
      ) : (
        <Template2Sections
          payload={payload}
          openSections={openSections}
          toggle={toggle}
          rows={rows}
          setRows={(key, v) => setPayloadSection(key as keyof ReportPayload, v)}
        />
      )}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white lg:static lg:z-auto lg:mt-2 lg:rounded-xl lg:border lg:shadow-sm lg:bottom-auto">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-2 lg:mx-0 lg:max-w-none">
          {isPowerTr && !isLastSheet ? (
            <Button className="h-11 flex-1" disabled={busy !== null} onClick={saveAndNextSheet}>
              {busy === "save" ? "Saving…" : "Save & Next"}
              {busy !== "save" && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="h-11 flex-1" disabled={busy !== null} onClick={() => persistAndSubmit(false)}>
                <Save className="mr-1 h-4 w-4" />
                {busy === "save" ? "Saving…" : isPowerTr || isEquipment ? "Save" : "Save changes"}
              </Button>
              {canSubmit && (
                <Button className="h-11 flex-1" disabled={busy !== null || !canSubmit} onClick={() => persistAndSubmit(true)}>
                  <Send className="mr-1 h-4 w-4" />
                  {busy === "submit" ? "Submitting…" : "Submit"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden" />
    </div>
  );
}

function Template1Checklist({
  rows,
  onRows,
  reportId,
}: {
  rows: ChecklistRow[];
  onRows: (rows: ChecklistRow[]) => void;
  reportId: string;
}) {
  const [showAdd, setShowAdd] = useState(rows.length > 0);
  const [newTest, setNewTest] = useState("");

  function update(i: number, patch: Partial<ChecklistRow>) {
    onRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <>
      <Section title="Test checklist" subtitle="Enter reading for each test">
        {rows.map((row, i) => (
          <div key={`${row.testName}-${i}`} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white/70 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">{row.testName || `Test ${i + 1}`}</p>
              {rows.length > 1 && (
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => onRows(rows.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <Field label="Reading / value">
                <Input value={row.readings ?? ""} onChange={(e) => update(i, { readings: e.target.value })} inputMode="decimal" placeholder="Enter value" />
              </Field>
              <Field label="Remarks">
                <Input value={row.remarks ?? ""} onChange={(e) => update(i, { remarks: e.target.value })} placeholder="Optional" />
              </Field>
            </div>
          </div>
        ))}
      </Section>

      {showAdd && (
        <Section title="Add checklist item">
          <div className="flex gap-2">
            <Input value={newTest} onChange={(e) => setNewTest(e.target.value)} placeholder="Custom test name" />
            <Button
              type="button"
              variant="outline"
              disabled={!newTest.trim()}
              onClick={() => {
                onRows([...rows, { testName: newTest.trim(), status: "COMPLETED" }]);
                setNewTest("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Section>
      )}

      {!showAdd && rows.length === 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onRows([
            ...[
              "Visual Inspection",
              "Current Transformer Ratio Test",
              "Winding Resistance Test",
              "Insulation Resistance Test",
              "Polarity Test",
              "KV Point Test",
              "Magnetising Current Test",
            ].map((t) => ({ testName: t, status: "COMPLETED" as const })),
          ])}
        >
          <FileCheck2 className="mr-2 h-4 w-4" />
          Load standard 7-test checklist
        </Button>
      )}
    </>
  );
}

const RATIO_PLAN: [string, string][] = [];
for (const p of PHASES) {
  for (const c of ["15", "30", "45", "60"]) RATIO_PLAN.push([p, c]);
}
const RATIO_TABLES: { title: string; headers: string[] }[] = [
  {
    title: "Core 1 & Core 2",
    headers: ["Phase", "Inj. (A)", "Core – 1 · 600/1", "Core – 1 · 300/1", "Core – 2 · 600/1", "Core – 2 · 300/1"],
  },
  {
    title: "Core 3 & Core 4",
    headers: ["Phase", "Inj. (A)", "Core – 3 · 600/1", "Core – 3 · 300/1", "Core – 4 · 600/1", "Core – 4 · 300/1"],
  },
];
const CORE_ID_STAGES: [string, string][] = [
  ["BEFORE_SHORTING", "Before shorting CT sec terminals"],
  ["AFTER_SHORTING", "After shorting CT sec terminals"],
];
const KV_BLOCKS: [string, number][] = [
  ["3S1-3S3 (Core 3)", 0],
  ["4S1-4S3 (Core 4)", 5],
];
const CONNECTION_MA_LINES: [keyof NonNullable<ReportPayload["connection"]>, string][] = [
  ["d11D71", "D11 – D71"],
  ["d31D71", "D31 – D71"],
  ["d51D71", "D51 – D71"],
  ["c11C71", "C11 – C71"],
  ["c31C71", "C31 – C71"],
  ["c51C71", "C51 – C71"],
];
const CORE_PARAMS: [string, string][] = [
  ["Ratio (Primary)", "primaryRatio"],
  ["Ratio (Secondary)", "secondaryRatio"],
  ["Rated Burden (VA)", "ratedBurden"],
  ["Accuracy Class", "accuracyClass"],
  ["ALF / ISF", "alfIsf"],
  ["Min KPV", "minimumKPV"],
  ["Lex @600/1A", "lexAt6001A"],
  ["Rct at 75°C", "rctAt75C"],
];

function FixedLabel({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{children}</span>;
}

function Td({ children, className, rowSpan }: { children?: React.ReactNode; className?: string; rowSpan?: number }) {
  return (
    <td className={`border-b border-slate-100 px-1.5 py-1.5 align-middle ${className ?? ""}`} rowSpan={rowSpan}>
      {children}
    </td>
  );
}

function CellInput({
  value,
  onChange,
  placeholder,
  inputMode,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`h-8 w-full min-w-[56px] rounded-md border border-slate-300 bg-white px-1.5 text-center text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${className ?? ""}`}
    />
  );
}

function GridTable({ headers, minWidth, children }: { headers: string[]; minWidth?: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function AccordionSection({
  id,
  title,
  children,
  openSections,
  toggle,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  openSections: Record<string, boolean>;
  toggle: (sec: string) => void;
}) {
  if (!["spec", "cores", "capacitance"].includes(id)) return null;
  const open = openSections[id] === true;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" className="flex w-full items-center justify-between gap-2 bg-slate-50/50 px-4 py-3.5 text-left transition active:bg-slate-100" onClick={() => toggle(id)}>
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}

function Template2Sections({
  payload,
  openSections,
  toggle,
  rows,
  setRows,
}: {
  payload: ReportPayload;
  openSections: Record<string, boolean>;
  toggle: (sec: string) => void;
  rows: (key: keyof ReportPayload) => any[];
  setRows: (key: keyof ReportPayload, value: any) => void;
}) {
  const spec = payload.specifications ?? {};
  function setSpec(k: string, v: string) {
    setRows("specifications" as keyof ReportPayload, { ...(payload.specifications ?? {}), [k]: v });
  }

  const cores = ensureRows("cores" as keyof ReportPayload, 4, (i) => ({ coreName: `Core ${i + 1}` }));
  const insRows = ensureRows("insulation" as keyof ReportPayload, 4, (i) => ({
    testType: ["Primary to Earth", "Primary to Sec.", "Secondary to Earth", "Between Secondary"][i],
    meggerUsed: ["5 KV", "", "500 V", ""][i],
    status: "PENDING",
  }));
  const windRows = ensureRows("winding" as keyof ReportPayload, 8, (i) => ({
    connection: WINDING_CONNECTIONS[i],
    value: "",
    rPhase: "",
    yPhase: "",
    bPhase: "",
  }));
  const polRows = ensureRows("polarity" as keyof ReportPayload, 3, (i) => ({
    phase: PHASES[i],
    core1: "",
    core2: "",
    core3: "",
    core4: "",
  }));
  const kvRows = ensureRows("kneePoint" as keyof ReportPayload, 10, (i) => ({
    core: i < 5 ? "3S1-3S3" : "4S1-4S3",
    kvStep: KNEE_POINT_STEPS[i % 5],
    appliedVoltage: ["162.5", "325", "487.5", "650", "715"][i % 5],
    kneePointVoltage: "650",
    lex: "30",
  }));
  const seriesRows = ensureRows("series" as keyof ReportPayload, 4, (i) => ({
    description: ["R Phase", "Y Phase", "B Phase", "E/F"][i],
  }));
  const meteringRows = ensureRows("meteringProtection" as keyof ReportPayload, 4, (i) => ({
    description: ["R Phase (D11)", "Y Phase (D31)", "B Phase (D51)", "E/F (D71)"][i],
  }));
  const connection = payload.connection ?? {};
  const coreIdInjected = rows("coreIdentification")?.[0]?.injectedCurrent ?? "";
  const coreIdRatio = rows("coreIdentification")?.[0]?.ratio ?? "";

  return (
    <div className="space-y-3">
      <AccordionSection id="spec" title="1. CT Specification / Nameplate" openSections={openSections} toggle={toggle}>
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
          {([
            ["make", "Make"],
            ["type", "Type"],
            ["insulation", "Insulation"],
            ["hsv", "Highest System Voltage (HSV)"],
            ["ratedSTC", "Rated STC"],
            ["nsv", "Normal System Voltage (NSV)"],
            ["crepage", "Creepage"],
            ["referenceStandards", "Ref. Standards"],
            ["weight", "Weight of CT"],
            ["quantityOfOil", "Qty. of Oil"],
            ["ratedFrequency", "Rated Freq."],
            ["insulationClass", "Insulation Class"],
            ["icth", "Icth"],
            ["waNumber", "WA No."],
            ["yearOfManufacturing", "Year of Mfg."],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input value={spec[key] ?? ""} onChange={(e) => setSpec(key, e.target.value)} />
            </Field>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection id="cores" title="2. Core Details" openSections={openSections} toggle={toggle}>
        <GridTable
          headers={["", "Core – 1", "Core – 2", "Core – 3", "Core – 4"]}
          minWidth={560}
        >
          {CORE_PARAMS.map(([label, key]) => (
            <tr key={key}>
              <Td className="whitespace-nowrap"><FixedLabel>{label}</FixedLabel></Td>
              {cores.map((c, i) => (
                <Td key={i}>
                  <CellInput value={c[key] ?? ""} onChange={(v) => updateCore(i, key, v)} />
                </Td>
              ))}
            </tr>
          ))}
        </GridTable>
      </AccordionSection>

      <AccordionSection id="capacitance" title="3. Capacitance & Tan Delta" openSections={openSections} toggle={toggle}>
        <GridTable headers={["Particular", "R Phase", "Y Phase", "B Phase"]} minWidth={430}>
          <tr>
            <Td className="whitespace-nowrap"><FixedLabel>Sr. No.</FixedLabel></Td>
            {PHASES.map((p) => (
              <Td key={p}><CellInput value={capValue(p, "srNo")} onChange={(v) => setCap(p, "srNo", v)} /></Td>
            ))}
          </tr>
          <tr>
            <Td className="whitespace-nowrap"><FixedLabel>Capacitance (pF)</FixedLabel></Td>
            {PHASES.map((p) => (
              <Td key={p}><CellInput inputMode="decimal" value={capValue(p, "capacitance")} onChange={(v) => setCap(p, "capacitance", v)} /></Td>
            ))}
          </tr>
          <tr>
            <Td className="whitespace-nowrap"><FixedLabel>Tan δ (%)</FixedLabel></Td>
            {PHASES.map((p) => (
              <Td key={p}><CellInput inputMode="decimal" value={capValue(p, "tanDelta")} onChange={(v) => setCap(p, "tanDelta", v)} /></Td>
            ))}
          </tr>
        </GridTable>
      </AccordionSection>

      <AccordionSection id="insulation" title="4. Insulation Resistance Test" openSections={openSections} toggle={toggle}>
        <GridTable headers={["Test", "Megger Used", "R Phase", "Y Phase", "B Phase"]} minWidth={520}>
          {insRows.map((r, i) => (
            <tr key={`${r.testType}-${i}`}>
              <Td className="whitespace-nowrap"><FixedLabel>{r.testType}</FixedLabel></Td>
              <Td className="w-28">
                <CellInput value={r.meggerUsed ?? ""} onChange={(v) => setAt("insulation", i, "meggerUsed", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.rPhase ?? ""} onChange={(v) => setAt("insulation", i, "rPhase", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.yPhase ?? ""} onChange={(v) => setAt("insulation", i, "yPhase", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.bPhase ?? ""} onChange={(v) => setAt("insulation", i, "bPhase", v)} />
              </Td>
            </tr>
          ))}
        </GridTable>
      </AccordionSection>

      <AccordionSection id="winding" title="5. Secondary Winding Resistance" openSections={openSections} toggle={toggle}>
        <GridTable headers={["Connection", "R Phase", "Y Phase", "B Phase"]} minWidth={460}>
          {windRows.map((r, i) => (
            <tr key={`${r.connection}-${i}`}>
              <Td className="whitespace-nowrap"><FixedLabel>{r.connection}</FixedLabel></Td>
              <Td>
                <CellInput inputMode="decimal" value={r.rPhase ?? ""} onChange={(v) => setAt("winding", i, "rPhase", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.yPhase ?? ""} onChange={(v) => setAt("winding", i, "yPhase", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.bPhase ?? ""} onChange={(v) => setAt("winding", i, "bPhase", v)} />
              </Td>
            </tr>
          ))}
        </GridTable>
        <p className="text-xs text-slate-400">Value (Ω) per phase</p>
      </AccordionSection>

      <AccordionSection id="polarity" title="6. Polarity Test" openSections={openSections} toggle={toggle}>
        <p className="text-xs text-slate-500">
          Primary P1 taken as +Ve, P2 taken as –Ve. Connect polarity meter across S1–S2 while applying DC on Primary P1–P2.
        </p>
        <GridTable headers={["Phase", "Core – 1", "Core – 2", "Core – 3", "Core – 4"]} minWidth={460}>
          {polRows.map((r, i) => (
            <tr key={`${r.phase}-${i}`}>
              <Td className="whitespace-nowrap"><FixedLabel>{r.phase}</FixedLabel></Td>
              {["core1", "core2", "core3", "core4"].map((c) => (
                <Td key={c}>
                  <CellInput placeholder="ADD/SUBT" value={r[c] ?? ""} onChange={(v) => setAt("polarity", i, c, v)} />
                </Td>
              ))}
            </tr>
          ))}
        </GridTable>
      </AccordionSection>

      <AccordionSection id="coreid" title="7. Core Identification Test" openSections={openSections} toggle={toggle}>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm">
          <span className="text-xs font-medium text-slate-600">Ø Primary injected:</span>
          <CellInput
            className="w-16"
            inputMode="decimal"
            value={coreIdInjected}
            onChange={(v) => setSharedCoreId("injectedCurrent", v)}
          />
          <span className="text-xs font-medium text-slate-600">A &nbsp;·&nbsp; Secondary Measured, Ratio:</span>
          <CellInput
            className="w-24"
            value={coreIdRatio}
            onChange={(v) => setSharedCoreId("ratio", v)}
          />
        </div>
        {CORE_ID_STAGES.map(([stage, label]) => (
          <div key={stage} className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">{label}</p>
            <GridTable headers={["Phase", "Core – 1", "Core – 2", "Core – 3", "Core – 4"]} minWidth={480}>
              {PHASES.map((ph) => {
                const idx = coreIdIndex(stage, ph);
                return (
                  <tr key={ph}>
                    <Td className="whitespace-nowrap"><FixedLabel>{ph}</FixedLabel></Td>
                    {["core1", "core2", "core3", "core4"].map((c) => (
                      <Td key={c}>
                        <CellInput inputMode="decimal" value={coreIdValue(idx, c)} onChange={(v) => setAt("coreIdentification", idx, c, v)} />
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </GridTable>
          </div>
        ))}
      </AccordionSection>

      <AccordionSection id="ratio" title="8. Ratio Test" openSections={openSections} toggle={toggle}>
        <p className="text-xs text-slate-500">Measured secondary current (mA) per core and ratio tap.</p>
        {RATIO_TABLES.map((tbl, k) => (
          <div key={k} className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">{tbl.title}</p>
            <GridTable headers={tbl.headers} minWidth={640}>
              {RATIO_PLAN.map(([ph, cur], ri) => {
                const idx = k * 12 + ri;
                return (
                  <tr key={ri}>
                    {ri % 4 === 0 && (
                      <Td rowSpan={4} className="align-middle">
                        <FixedLabel>{ph}</FixedLabel>
                      </Td>
                    )}
                    <Td className="whitespace-nowrap"><FixedLabel>{cur}</FixedLabel></Td>
                    {["core1", "core2", "core3", "core4"].map((c) => (
                      <Td key={c}>
                        <CellInput inputMode="decimal" value={ratioValue(idx, c)} onChange={(v) => setRatio(k, ri, c, v)} />
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </GridTable>
          </div>
        ))}
      </AccordionSection>

      <AccordionSection id="kv" title="9. KV Point (Knee Point) Test" openSections={openSections} toggle={toggle}>
        <p className="text-xs text-slate-500">Knee Point Voltage: 650 V &nbsp;·&nbsp; Lex (mA): 30 at Vk/2</p>
        {KV_BLOCKS.map(([core, off]) => (
          <div key={core} className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">{core}</p>
            <GridTable headers={["Step", "Applied Voltage (V)", "R Phase", "Y Phase", "B Phase"]} minWidth={560}>
              {KNEE_POINT_STEPS.map((step, ri) => {
                const idx = (off as number) + ri;
                const row = kvRows[idx] ?? {};
                return (
                  <tr key={step}>
                    <Td className="whitespace-nowrap"><FixedLabel>{ri + 1}. {step}</FixedLabel></Td>
                    <Td className="w-28">
                      <CellInput inputMode="decimal" value={row.appliedVoltage ?? ""} onChange={(v) => setAt("kneePoint", idx, "appliedVoltage", v)} />
                    </Td>
                    <Td>
                      <CellInput inputMode="decimal" value={row.rPhase ?? ""} onChange={(v) => setAt("kneePoint", idx, "rPhase", v)} />
                    </Td>
                    <Td>
                      <CellInput inputMode="decimal" value={row.yPhase ?? ""} onChange={(v) => setAt("kneePoint", idx, "yPhase", v)} />
                    </Td>
                    <Td>
                      <CellInput inputMode="decimal" value={row.bPhase ?? ""} onChange={(v) => setAt("kneePoint", idx, "bPhase", v)} />
                    </Td>
                  </tr>
                );
              })}
            </GridTable>
          </div>
        ))}
      </AccordionSection>

      <AccordionSection id="conn" title="10. CT Connection" openSections={openSections} toggle={toggle}>
        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2">
            <span className="min-w-[56px] text-sm font-semibold text-slate-700">P1 =</span>
            <Input value={connection.p1Side ?? ""} onChange={(e) => setConnection("p1Side", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-[56px] text-sm font-semibold text-slate-700">P2 =</span>
            <Input value={connection.p2Side ?? ""} onChange={(e) => setConnection("p2Side", e.target.value)} />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection id="series" title="11. CT Series Test" openSections={openSections} toggle={toggle}>
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Primary injected</span>
            <CellInput
              className="w-16"
              inputMode="decimal"
              value={connection.primaryInjection ?? ""}
              onChange={(v) => setConnection("primaryInjection", v)}
            />
            <span className="text-xs font-medium text-slate-600">A &nbsp;·&nbsp; Ratio:</span>
            <CellInput
              className="w-32"
              value={connection.ratio ?? ""}
              onChange={(v) => setConnection("ratio", v)}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CONNECTION_MA_LINES.map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-20 shrink-0 text-xs font-medium text-slate-600">{label}:</span>
                <CellInput
                  className="min-w-0 flex-1"
                  inputMode="decimal"
                  value={connection[key] ?? ""}
                  onChange={(v) => setConnection(key, v)}
                />
                <span className="text-xs text-slate-400">mA</span>
              </div>
            ))}
          </div>
        </div>
        <GridTable headers={["Description", "Primary", "Sec.", "A Meter", "MFM", "PQM Meter"]} minWidth={620}>
          {seriesRows.map((r, i) => (
            <tr key={`${r.description}-${i}`}>
              <Td className="whitespace-nowrap"><FixedLabel>{r.description}</FixedLabel></Td>
              {(["primary", "secondary", "aMeter", "mfm", "pqmMeter"] as const).map((f) => (
                <Td key={f}>
                  <CellInput inputMode="decimal" value={r[f] ?? ""} onChange={(v) => setAt("series", i, f, v)} />
                </Td>
              ))}
            </tr>
          ))}
        </GridTable>
      </AccordionSection>

      <AccordionSection id="metering" title="12. Metering & Protection Core" openSections={openSections} toggle={toggle}>
        <GridTable headers={["Description", "Metering Core (mA)", "Protection Core (mA)"]} minWidth={480}>
          {meteringRows.map((r, i) => (
            <tr key={`${r.description}-${i}`}>
              <Td className="whitespace-nowrap"><FixedLabel>{r.description}</FixedLabel></Td>
              <Td>
                <CellInput inputMode="decimal" value={r.meteringCore ?? ""} onChange={(v) => setAt("meteringProtection", i, "meteringCore", v)} />
              </Td>
              <Td>
                <CellInput inputMode="decimal" value={r.protectionCore ?? ""} onChange={(v) => setAt("meteringProtection", i, "protectionCore", v)} />
              </Td>
            </tr>
          ))}
        </GridTable>
      </AccordionSection>
    </div>
  );

  function setConnection(k: string, v: string) {
    setRows("connection" as keyof ReportPayload, { ...(payload.connection ?? {}), [k]: v });
  }

  function ensureRows(key: keyof ReportPayload, count: number, factory: (i: number) => any): any[] {
    const list = [...(rows(key) ?? [])];
    while (list.length < count) list.push(factory(list.length));
    return list;
  }

  // Rows are indexed positionally, so a row that does not exist yet must still
  // carry the columns the database requires (phase, stage, connection, ...).
  function rowFactory(key: keyof ReportPayload, i: number): any {
    switch (key) {
      case "ratio": {
        const [phase, step] = RATIO_PLAN[i % RATIO_PLAN.length] ?? ["R", "15"];
        return { phase, injectedCurrent: step, core1: "", core2: "", core3: "", core4: "" };
      }
      case "coreIdentification":
        return {
          stage: i < 3 ? "BEFORE_SHORTING" : "AFTER_SHORTING",
          phase: PHASES[i % 3],
          injectedCurrent: "",
          core1: "",
          core2: "",
          core3: "",
          core4: "",
        };
      case "polarity":
        return { phase: PHASES[i % 3], core1: "", core2: "", core3: "", core4: "" };
      case "winding":
        return { connection: WINDING_CONNECTIONS[i] ?? "", value: "", rPhase: "", yPhase: "", bPhase: "" };
      case "insulation":
        return {
          testType: ["Primary to Earth", "Primary to Sec.", "Secondary to Earth", "Between Secondary"][i] ?? "",
          status: "PENDING",
        };
      case "cores":
        return { coreName: `Core ${i + 1}` };
      default:
        return {};
    }
  }

  function setAt(key: keyof ReportPayload, i: number, field: string, v: string) {
    const list = [...(rows(key) ?? [])];
    while (list.length <= i) list.push(rowFactory(key, list.length));
    list[i] = { ...list[i], [field]: v };
    setRows(key, list);
  }

  function updateCore(i: number, key: string, v: string) {
    const list = ensureRows("cores" as keyof ReportPayload, i + 1, (n) => ({ coreName: `Core ${n + 1}` }));
    list[i] = { ...list[i], [key]: v };
    setRows("cores" as keyof ReportPayload, list);
  }

  function capValue(phase: string, field: string): string {
    const row = (rows("capacitance") as any[]).find((r) => r.particular === phase);
    return row?.[field] ?? "";
  }

  function setCap(phase: string, field: string, v: string) {
    const list = [...(rows("capacitance") as any[])];
    let idx = list.findIndex((r) => r.particular === phase);
    if (idx === -1) {
      idx = list.length;
      list.push({ particular: phase });
    }
    list[idx] = { ...list[idx], [field]: v };
    setRows("capacitance" as keyof ReportPayload, list);
  }

  function coreIdIndex(stage: string, phase: string) {
    return (stage === "AFTER_SHORTING" ? 3 : 0) + PHASES.indexOf(phase);
  }

  function coreIdValue(idx: number, field: string) {
    return rows("coreIdentification")[idx]?.[field] ?? "";
  }

  function setSharedCoreId(field: "injectedCurrent" | "ratio", v: string) {
    const list = ensureRows("coreIdentification" as keyof ReportPayload, 6, (i) => ({
      stage: i < 3 ? "BEFORE_SHORTING" : "AFTER_SHORTING",
      phase: PHASES[i % 3],
    }));
    setRows("coreIdentification" as keyof ReportPayload, list.map((r) => ({ ...r, [field]: v })));
  }

  function ratioValue(idx: number, field: string) {
    return rows("ratio")[idx]?.[field] ?? "";
  }

  function setRatio(k: number, ri: number, field: string, v: string) {
    setAt("ratio" as keyof ReportPayload, k * 12 + ri, field, v);
  }
}