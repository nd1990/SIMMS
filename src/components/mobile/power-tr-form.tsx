"use client";

import { Fragment } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SignatureFields } from "@/components/mobile/signature-fields";
import {
  type PowerTrData,
  type PowerTrHeader,
  type VectorGroupData,
  type MeggerData,
  type TanDeltaHeader,
  type HvBushingPhase,
  type IrRow,
  type BdvRow,
  type WindingTanDeltaRow,
  calcCalRatio,
  calcRatioError,
  calcMaxLimit,
  calcMinLimit,
  calcPi,
  fmt,
  toNum,
} from "@/lib/power-tr-types";

// ------------------------------------------------------------
// Excel-style table primitives
// ------------------------------------------------------------

function TableWrap({
  minWidth,
  addRow,
  children,
}: {
  minWidth?: number;
  addRow?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="w-full border-collapse text-sm" style={minWidth ? { minWidth } : undefined}>
          {children}
        </table>
      </div>
      {addRow && <AddRowButton onClick={addRow} />}
    </div>
  );
}

function AddRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-teal-400 bg-teal-50/40 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 active:scale-[0.99]"
    >
      <Plus className="h-3.5 w-3.5" />
      Add row
    </button>
  );
}

function Th({
  children,
  colSpan,
  rowSpan,
  sticky,
  className,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "whitespace-nowrap border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600",
        sticky && "sticky left-0 z-20 w-12 min-w-[46px] border-r-2 border-r-slate-300",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  colSpan,
  rowSpan,
  sticky,
  className,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-slate-300 align-middle",
        sticky && "sticky left-0 z-10 w-12 min-w-[46px] border-r-2 border-r-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-600",
        className
      )}
    >
      {children}
    </td>
  );
}

function LabelCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Td className={cn("whitespace-nowrap bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600", className)}>{children}</Td>;
}

function XInput({
  value,
  onChange,
  placeholder,
  inputMode = "decimal",
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
      className={cn(
        "h-9 w-full min-w-[52px] bg-white px-1.5 text-center text-sm text-slate-900 outline-none transition focus:bg-teal-50 focus:ring-1 focus:ring-inset focus:ring-teal-400",
        className
      )}
    />
  );
}

function XCalc({ value }: { value: string }) {
  return (
    <div className="flex h-9 min-w-[52px] items-center justify-center bg-teal-50/70 px-1.5 text-center text-sm font-semibold text-teal-700">
      {value || "—"}
    </div>
  );
}

function AutoLegend() {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="inline-block h-3 w-3 rounded-[3px] bg-teal-50 ring-1 ring-teal-300" />
      Auto-calculated — fills itself as you type
    </p>
  );
}

function SheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-t-lg border border-b-0 border-slate-300 bg-teal-700 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 mb-1.5 text-xs font-bold text-slate-700">{children}</p>;
}

// ------------------------------------------------------------
// Sheet tabs (mirrors the Excel sheet tabs)
// ------------------------------------------------------------

export const SHEET_TABS = [
  { id: "ratio", label: "1 · Ratio" },
  { id: "vr", label: "2 · Voltage Ratio" },
  { id: "mb", label: "3 · MB / Short Ckt" },
  { id: "chg", label: "4 · Charging" },
  { id: "wr", label: "5 · Winding" },
  { id: "vg", label: "6 · Vector / IR / BDV" },
  { id: "td", label: "7 · Tan Delta" },
  { id: "sign", label: "Signatures" },
] as const;

export type SheetId = (typeof SHEET_TABS)[number]["id"];

// ------------------------------------------------------------
// Main form
// ------------------------------------------------------------

export function PowerTrForm({
  data,
  onChange,
  tab,
  onTabChange,
}: {
  data: PowerTrData;
  onChange: (data: PowerTrData) => void;
  tab: SheetId;
  onTabChange: (tab: SheetId) => void;
}) {
  function patch(partial: Partial<PowerTrData>) {
    onChange({ ...data, ...partial });
  }

  function setHeader<K extends keyof PowerTrHeader>(key: K, value: string) {
    patch({ header: { ...data.header, [key]: value } });
  }

  function setVector<K extends keyof VectorGroupData>(key: K, value: string) {
    patch({ vectorGroup: { ...data.vectorGroup, [key]: value } });
  }

  function setMegger<K extends keyof MeggerData>(key: K, value: string) {
    patch({ megger: { ...data.megger, [key]: value } });
  }

  function setTdHeader<K extends keyof TanDeltaHeader>(key: K, value: string) {
    patch({ tanDeltaHeader: { ...data.tanDeltaHeader, [key]: value } });
  }

  function setBushing(phase: "r" | "y" | "b", key: keyof HvBushingPhase, value: string) {
    if (key === "make" && phase === "r") {
      patch({
        hvBushing: {
          r: { ...data.hvBushing.r, make: value },
          y: { ...data.hvBushing.y, make: value },
          b: { ...data.hvBushing.b, make: value },
        },
      });
      return;
    }
    patch({ hvBushing: { ...data.hvBushing, [phase]: { ...data.hvBushing[phase], [key]: value } } });
  }

  function setArr<T extends Record<string, unknown>>(
    key: "ratio" | "voltageRatio" | "mbHv" | "mbLv" | "shortCircuit" | "chargingHv" | "chargingLv" | "windingHv" | "windingLv",
    index: number,
    patchRow: Partial<T>
  ) {
    const list = (data[key] as unknown as T[]).map((row, i) => (i === index ? { ...row, ...patchRow } : row));
    patch({ [key]: list } as unknown as Partial<PowerTrData>);
  }

  function setIr(index: number, patchRow: Partial<IrRow>) {
    patch({ ir: data.ir.map((row, i) => (i === index ? { ...row, ...patchRow } : row)) });
  }

  function setBdv(index: number, patchRow: Partial<BdvRow>) {
    patch({ bdv: data.bdv.map((row, i) => (i === index ? { ...row, ...patchRow } : row)) });
  }

  function setTdRow(index: number, patchRow: Partial<WindingTanDeltaRow>) {
    patch({ windingTanDelta: data.windingTanDelta.map((row, i) => (i === index ? { ...row, ...patchRow } : row)) });
  }

  function nextTap(list: { tap: number }[]): number {
    return list.reduce((max, row) => Math.max(max, Number(row.tap) || 0), 0) + 1;
  }

  function pushRow<T>(key: keyof PowerTrData, row: T) {
    const list = [...((data[key] as unknown as T[]) ?? []), row];
    patch({ [key]: list } as unknown as Partial<PowerTrData>);
  }

  const addRatioRow = () =>
    pushRow("ratio", { tap: nextTap(data.ratio), hvVoltage: "", lvVoltage: "", rActualRatio: "", rMa: "", yActualRatio: "", yMa: "", bActualRatio: "", bMa: "" });
  const addVoltageRatioRow = () =>
    pushRow("voltageRatio", { tap: nextTap(data.voltageRatio), rHv: "", rLv: "", yHv: "", yLv: "", bHv: "", bLv: "" });
  const addMbHvRow = () =>
    pushRow("mbHv", { tap: nextTap(data.mbHv), voltageApplied: "", rn: "", yn: "", bn: "", lvRn: "", lvYn: "", lvBn: "" });
  const addMbLvRow = () =>
    pushRow("mbLv", { tap: nextTap(data.mbLv), voltageApplied: "", rn: "", yn: "", bn: "" });
  const addShortCircuitRow = () =>
    pushRow("shortCircuit", { tap: nextTap(data.shortCircuit), hvR: "", hvY: "", hvB: "", lvR: "", lvY: "", lvB: "", lvN: "" });
  const addChargingHvRow = () => pushRow("chargingHv", { tap: nextTap(data.chargingHv), r: "", y: "", b: "" });
  const addChargingLvRow = () => pushRow("chargingLv", { tap: nextTap(data.chargingLv), r: "", y: "", b: "" });
  const addWindingHvRow = () => pushRow("windingHv", { tap: nextTap(data.windingHv), ry: "", yb: "", br: "" });
  const addWindingLvRow = () => pushRow("windingLv", { tap: nextTap(data.windingLv), ry: "", yb: "", br: "" });
  const addIrRow = () => pushRow("ir", { description: "", voltage: "", oneMin: "", tenMin: "" });
  const addBdvRow = () => pushRow("bdv", { description: "", before: "", after: "" });
  const addWindingTanDeltaRow = () =>
    pushRow("windingTanDelta", { nameOfPhase: "", testMode: "", appliedVoltage1: "", cap1: "", df1: "", appliedVoltage2: "", cap2: "", df2: "" });

  const h = data.header;

  const infoPairs: { key: keyof PowerTrHeader; label: string; unit?: string; mode?: "text" | "decimal"; type?: string }[] = [
    { key: "make", label: "Make" },
    { key: "dateOfTesting", label: "Date of Testing", type: "date" },
    { key: "srNo", label: "Sr. No." },
    { key: "rating", label: "Rating" },
    { key: "percentImpedance", label: "% Impedance", unit: "%" },
    { key: "hvAmp", label: "HV Amp.", mode: "decimal" },
    { key: "vectorGroup", label: "Vector Group" },
    { key: "lvAmp", label: "LV Amp.", mode: "decimal" },
    { key: "qtyOfOil", label: "Qty. of Oil", unit: "Ltr.", mode: "decimal" },
    { key: "hvVolts", label: "HV Volts", mode: "decimal" },
    { key: "yearOfMfg", label: "Year of Mfg." },
    { key: "lvVolts", label: "LV Volts", mode: "decimal" },
  ];

  return (
    <div className="space-y-3">
      {/* Sheet tab bar */}
      <div className="sticky top-14 z-30 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SHEET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                tab === t.id
                  ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-100"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Ratio Test ---------------------------------------------------- */}
      {tab === "ratio" && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="bg-teal-700 px-3 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-white">
              {h.mva ? `${h.mva} MVA, ` : ""}66/33 KV TR. TESTING REPORT
            </div>
            <div className="grid grid-cols-1 gap-2 border-b border-slate-200 p-3 sm:grid-cols-2">
              <Field label="Party Name">
                <Input value={h.partyName} onChange={(e) => setHeader("partyName", e.target.value)} placeholder="Party name" />
              </Field>
              <Field label="Name of Sub-Station">
                <Input value={h.substationName} onChange={(e) => setHeader("substationName", e.target.value)} placeholder="Sub-station" />
              </Field>
              <Field label="MVA Rating (in title)">
                <Input value={h.mva} onChange={(e) => setHeader("mva", e.target.value)} placeholder="e.g. 31.5" inputMode="decimal" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-200">
              {infoPairs.map((f) => (
                <div key={f.key} className="bg-white p-2">
                  <Label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    {f.label}
                    {f.unit && <span className="font-normal text-slate-400">({f.unit})</span>}
                  </Label>
                  <Input
                    className="h-9 px-2 text-sm"
                    type={f.type}
                    inputMode={f.mode}
                    value={h[f.key]}
                    onChange={(e) => setHeader(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <SheetTitle>1. Ratio Test</SheetTitle>
          <AutoLegend />
          <div className="-mt-2">
            <TableWrap minWidth={940} addRow={addRatioRow}>
              <thead>
                <tr>
                  <Th rowSpan={2} sticky>
                    Tap No.
                  </Th>
                  <Th rowSpan={2}>HV Voltage</Th>
                  <Th rowSpan={2}>LV Voltage</Th>
                  <Th rowSpan={2}>Cal. Ratio</Th>
                  <Th colSpan={3} className="bg-slate-200">
                    R - Phase
                  </Th>
                  <Th colSpan={3} className="bg-slate-200">
                    Y - Phase
                  </Th>
                  <Th colSpan={3} className="bg-slate-200">
                    B - Phase
                  </Th>
                  <Th rowSpan={2}>Max. Limit</Th>
                  <Th rowSpan={2}>Min. Limit</Th>
                </tr>
                <tr>
                  <Th>% Ratio Error</Th>
                  <Th>Actual Ratio</Th>
                  <Th>mA</Th>
                  <Th>% Ratio Error</Th>
                  <Th>Actual Ratio</Th>
                  <Th>mA</Th>
                  <Th>% Ratio Error</Th>
                  <Th>Actual Ratio</Th>
                  <Th>mA</Th>
                </tr>
              </thead>
              <tbody>
                {data.ratio.map((row, i) => {
                  const cal = calcCalRatio(row.hvVoltage, row.lvVoltage);
                  return (
                    <tr key={row.tap}>
                      <Td sticky>{row.tap}</Td>
                      <Td>
                        <XInput value={row.hvVoltage} onChange={(v) => setArr("ratio", i, { hvVoltage: v })} />
                      </Td>
                      <Td>
                        <XInput value={row.lvVoltage} onChange={(v) => setArr("ratio", i, { lvVoltage: v })} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(cal, 4)} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(calcRatioError(row.rActualRatio, cal), 3)} />
                      </Td>
                      <Td>
                        <XInput value={row.rActualRatio} onChange={(v) => setArr("ratio", i, { rActualRatio: v })} />
                      </Td>
                      <Td>
                        <XInput value={row.rMa} onChange={(v) => setArr("ratio", i, { rMa: v })} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(calcRatioError(row.yActualRatio, cal), 3)} />
                      </Td>
                      <Td>
                        <XInput value={row.yActualRatio} onChange={(v) => setArr("ratio", i, { yActualRatio: v })} />
                      </Td>
                      <Td>
                        <XInput value={row.yMa} onChange={(v) => setArr("ratio", i, { yMa: v })} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(calcRatioError(row.bActualRatio, cal), 3)} />
                      </Td>
                      <Td>
                        <XInput value={row.bActualRatio} onChange={(v) => setArr("ratio", i, { bActualRatio: v })} />
                      </Td>
                      <Td>
                        <XInput value={row.bMa} onChange={(v) => setArr("ratio", i, { bMa: v })} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(calcMaxLimit(cal), 4)} />
                      </Td>
                      <Td>
                        <XCalc value={fmt(calcMinLimit(cal), 4)} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </div>
        </div>
      )}

      {/* 2. Voltage Ratio Test ------------------------------------------- */}
      {tab === "vr" && (
        <div className="space-y-3">
          <SheetTitle>2. Voltage Ratio Test</SheetTitle>
          <TableWrap minWidth={560} addRow={addVoltageRatioRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={2} className="bg-slate-200">
                  R - Phase
                </Th>
                <Th colSpan={2} className="bg-slate-200">
                  Y - Phase
                </Th>
                <Th colSpan={2} className="bg-slate-200">
                  B - Phase
                </Th>
              </tr>
              <tr>
                <Th>HV</Th>
                <Th>LV</Th>
                <Th>HV</Th>
                <Th>LV</Th>
                <Th>HV</Th>
                <Th>LV</Th>
              </tr>
            </thead>
            <tbody>
              {data.voltageRatio.map((row, i) => (
                <tr key={row.tap}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.rHv} onChange={(v) => setArr("voltageRatio", i, { rHv: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.rLv} onChange={(v) => setArr("voltageRatio", i, { rLv: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yHv} onChange={(v) => setArr("voltageRatio", i, { yHv: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yLv} onChange={(v) => setArr("voltageRatio", i, { yLv: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.bHv} onChange={(v) => setArr("voltageRatio", i, { bHv: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.bLv} onChange={(v) => setArr("voltageRatio", i, { bLv: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* 3. MB Test / Short Circuit -------------------------------------- */}
      {tab === "mb" && (
        <div className="space-y-2">
          <SheetTitle>3. MB Test / Short Ckt Test</SheetTitle>

          <SubTitle>Magnetic Balance Test (HV Side) — 1-Ø applied on HV Side</SubTitle>
          <TableWrap minWidth={680} addRow={addMbHvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th rowSpan={2}>Voltage Applied</Th>
                <Th colSpan={3} className="bg-slate-200">
                  H. V. Side Voltage
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  L. V. Side Voltage
                </Th>
              </tr>
              <tr>
                <Th>RN</Th>
                <Th>YN</Th>
                <Th>BN</Th>
                <Th>rn</Th>
                <Th>yn</Th>
                <Th>bn</Th>
              </tr>
            </thead>
            <tbody>
              {data.mbHv.map((row, i) => (
                <tr key={row.tap}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.voltageApplied} onChange={(v) => setArr("mbHv", i, { voltageApplied: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.rn} onChange={(v) => setArr("mbHv", i, { rn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yn} onChange={(v) => setArr("mbHv", i, { yn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.bn} onChange={(v) => setArr("mbHv", i, { bn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvRn} onChange={(v) => setArr("mbHv", i, { lvRn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvYn} onChange={(v) => setArr("mbHv", i, { lvYn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvBn} onChange={(v) => setArr("mbHv", i, { lvBn: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <SubTitle>Magnetic Balance Test (LV Side) — 1-Ø applied on LV Side</SubTitle>
          <TableWrap minWidth={420} addRow={addMbLvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th rowSpan={2}>Voltage Applied</Th>
                <Th colSpan={3} className="bg-slate-200">
                  L. V. Side Voltage
                </Th>
              </tr>
              <tr>
                <Th>rn</Th>
                <Th>yn</Th>
                <Th>bn</Th>
              </tr>
            </thead>
            <tbody>
              {data.mbLv.map((row, i) => (
                <tr key={`${row.tap}-${i}`}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.voltageApplied} onChange={(v) => setArr("mbLv", i, { voltageApplied: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.rn} onChange={(v) => setArr("mbLv", i, { rn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yn} onChange={(v) => setArr("mbLv", i, { yn: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.bn} onChange={(v) => setArr("mbLv", i, { bn: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <SubTitle>Short Circuit Test — 3-Ø applied on HV Side & Secondary Shorted</SubTitle>
          <TableWrap minWidth={680} addRow={addShortCircuitRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  HV side Amp.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  LV side Amp.
                </Th>
                <Th rowSpan={2}>n (mA)</Th>
              </tr>
              <tr>
                <Th>R</Th>
                <Th>Y</Th>
                <Th>B</Th>
                <Th>r</Th>
                <Th>y</Th>
                <Th>b</Th>
              </tr>
            </thead>
            <tbody>
              {data.shortCircuit.map((row, i) => (
                <tr key={row.tap}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.hvR} onChange={(v) => setArr("shortCircuit", i, { hvR: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.hvY} onChange={(v) => setArr("shortCircuit", i, { hvY: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.hvB} onChange={(v) => setArr("shortCircuit", i, { hvB: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvR} onChange={(v) => setArr("shortCircuit", i, { lvR: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvY} onChange={(v) => setArr("shortCircuit", i, { lvY: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvB} onChange={(v) => setArr("shortCircuit", i, { lvB: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.lvN} onChange={(v) => setArr("shortCircuit", i, { lvN: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* 4. Charging Current ---------------------------------------------- */}
      {tab === "chg" && (
        <div className="space-y-2">
          <SheetTitle>4. Charging Current</SheetTitle>

          <SubTitle>Magnetizing Current Test (HV Side) — 440V applied on HV Side</SubTitle>
          <TableWrap minWidth={420} addRow={addChargingHvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  H. V. Side (mA)
                </Th>
              </tr>
              <tr>
                <Th>R</Th>
                <Th>Y</Th>
                <Th>B</Th>
              </tr>
            </thead>
            <tbody>
              {data.chargingHv.map((row, i) => (
                <tr key={row.tap}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.r} onChange={(v) => setArr("chargingHv", i, { r: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.y} onChange={(v) => setArr("chargingHv", i, { y: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.b} onChange={(v) => setArr("chargingHv", i, { b: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <SubTitle>Magnetizing Current Test (LV Side) — 440V applied on LV Side</SubTitle>
          <TableWrap minWidth={420} addRow={addChargingLvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  L. V. Side (mA)
                </Th>
              </tr>
              <tr>
                <Th>R</Th>
                <Th>Y</Th>
                <Th>B</Th>
              </tr>
            </thead>
            <tbody>
              {data.chargingLv.map((row, i) => (
                <tr key={`${row.tap}-${i}`}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.r} onChange={(v) => setArr("chargingLv", i, { r: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.y} onChange={(v) => setArr("chargingLv", i, { y: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.b} onChange={(v) => setArr("chargingLv", i, { b: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* 5. Winding Resistance -------------------------------------------- */}
      {tab === "wr" && (
        <div className="space-y-2">
          <SheetTitle>5. Winding Resistance</SheetTitle>

          <SubTitle>HV Winding — Resistance (mΩ)</SubTitle>
          <TableWrap minWidth={420} addRow={addWindingHvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  Resistance (mΩ)
                </Th>
              </tr>
              <tr>
                <Th>R-Y</Th>
                <Th>Y-B</Th>
                <Th>B-R</Th>
              </tr>
            </thead>
            <tbody>
              {data.windingHv.map((row, i) => (
                <tr key={row.tap}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.ry} onChange={(v) => setArr("windingHv", i, { ry: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yb} onChange={(v) => setArr("windingHv", i, { yb: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.br} onChange={(v) => setArr("windingHv", i, { br: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <SubTitle>LV Winding — Resistance (mΩ)</SubTitle>
          <TableWrap minWidth={420} addRow={addWindingLvRow}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  Tap No.
                </Th>
                <Th colSpan={3} className="bg-slate-200">
                  Resistance (mΩ)
                </Th>
              </tr>
              <tr>
                <Th>r-y</Th>
                <Th>y-b</Th>
                <Th>b-r</Th>
              </tr>
            </thead>
            <tbody>
              {data.windingLv.map((row, i) => (
                <tr key={`${row.tap}-${i}`}>
                  <Td sticky>{row.tap}</Td>
                  <Td>
                    <XInput value={row.ry} onChange={(v) => setArr("windingLv", i, { ry: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.yb} onChange={(v) => setArr("windingLv", i, { yb: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.br} onChange={(v) => setArr("windingLv", i, { br: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="text-[11px] text-slate-400">Ambient: 28 °C</p>
        </div>
      )}

      {/* 6. Vector Group / IR / BDV --------------------------------------- */}
      {tab === "vg" && (
        <div className="space-y-2">
          <SheetTitle>6. Vector Group / IR Value / BDV</SheetTitle>

          <SubTitle>Vector Group Check Test — 3-Ø applied on HV Side & R-r Shorted</SubTitle>
          {(() => {
            const vg = data.vectorGroup;
            const yy = toNum(vg.yy);
            const rn = toNum(vg.rn);
            const bb = toNum(vg.bb);
            const nn = toNum(vg.nn);
            const yb = toNum(vg.yb);
            const rnUpper = toNum(vg.rnUpper);

            // YNyn0 is confirmed when either relation holds: Bb = Yy OR Rn + nN = RN.
            const tol = 0.01;
            const bbMatchesYy = yy !== null && bb !== null && Math.abs(bb - yy) < tol;
            const rnNnMatchesRn = rn !== null && nn !== null && rnUpper !== null && Math.abs(rn + nn - rnUpper) < tol;
            const allFilled = yy !== null && rn !== null && bb !== null && nn !== null && yb !== null && rnUpper !== null;
            const isConfirmed = allFilled && (bbMatchesYy || rnNnMatchesRn);

            return (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <VectorField label="Yy (V)" value={vg.yy} ok={bbMatchesYy} onChange={(v) => setVector("yy", v)} />
                  <VectorField label="Rn (V)" value={vg.rn} ok={rnNnMatchesRn} onChange={(v) => setVector("rn", v)} />
                  <VectorField label="Bb (V)" value={vg.bb} ok={bbMatchesYy} onChange={(v) => setVector("bb", v)} />
                  <VectorField label="nN (V)" value={vg.nn} ok={rnNnMatchesRn} onChange={(v) => setVector("nn", v)} />
                  <VectorField label="Yb (V)" value={vg.yb} ok={isConfirmed} onChange={(v) => setVector("yb", v)} />
                  <VectorField label="RN (V)" value={vg.rnUpper} ok={rnNnMatchesRn} onChange={(v) => setVector("rnUpper", v)} />
                </div>
                <p
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    isConfirmed
                      ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  <CheckCircle2 className={cn("h-4 w-4 shrink-0", isConfirmed ? "text-emerald-600" : "text-slate-400")} />
                  <span>YNyn0 : Bb = Yy &nbsp;OR&nbsp; Rn + nN = RN &nbsp;→&nbsp; Result: YNyn0 Vector Group is Confirmed.</span>
                </p>
              </>
            );
          })()}

          <SubTitle>IR Value of Power Transformer</SubTitle>
          <AutoLegend />
          <TableWrap minWidth={460} addRow={addIrRow}>
            <thead>
              <tr>
                <Th>Description</Th>
                <Th>Voltage</Th>
                <Th>1 Minute (GΩ)</Th>
                <Th>10 Minute (GΩ)</Th>
                <Th>PI</Th>
              </tr>
            </thead>
            <tbody>
              {data.ir.map((row, i) => (
                <tr key={`${row.description}-${i}`}>
                  <LabelCell>{row.description}</LabelCell>
                  <Td>
                    <XInput inputMode="text" value={row.voltage} onChange={(v) => setIr(i, { voltage: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.oneMin} onChange={(v) => setIr(i, { oneMin: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.tenMin} onChange={(v) => setIr(i, { tenMin: v })} />
                  </Td>
                  <Td>
                    <XCalc value={fmt(calcPi(row.oneMin, row.tenMin), 3)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <SubTitle>IR Tester (Megger) Details</SubTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Make">
              <Input value={data.megger.make} onChange={(e) => setMegger("make", e.target.value)} />
            </Field>
            <Field label="Sr. No.">
              <Input value={data.megger.srNo} onChange={(e) => setMegger("srNo", e.target.value)} />
            </Field>
            <Field label="Voltage">
              <Input value={data.megger.voltage} onChange={(e) => setMegger("voltage", e.target.value)} />
            </Field>
          </div>

          <SubTitle>BDV Test of Oil (kV)</SubTitle>
          <TableWrap minWidth={420} addRow={addBdvRow}>
            <thead>
              <tr>
                <Th>Description</Th>
                <Th>Before Filtration</Th>
                <Th>After Filtration</Th>
              </tr>
            </thead>
            <tbody>
              {data.bdv.map((row, i) => (
                <tr key={`${row.description}-${i}`}>
                  <LabelCell>{row.description}</LabelCell>
                  <Td>
                    <XInput value={row.before} onChange={(v) => setBdv(i, { before: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.after} onChange={(v) => setBdv(i, { after: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* 7. Tan Delta ------------------------------------------------------ */}
      {tab === "td" && (
        <div className="space-y-2">
          <SheetTitle>7. Tan Delta &amp; Capacitance Test</SheetTitle>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-300 bg-slate-200">
            {(
              [
                ["nameOfSs", "Name of S/S"],
                ["dateOfTesting", "Date of Testing"],
                ["nameOfEquipment", "Name of Equipment"],
                ["vectorGroup", "Vector Group"],
                ["make", "Make"],
                ["mfgYear", "MFG Year"],
                ["serialNo", "Serial No"],
                ["ambientTemp", "Ambient Temperature"],
                ["oti", "OTI"],
                ["wti", "WTI"],
                ["humidity", "Humidity"],
                ["impedance", "Impedance (%)"],
              ] as [keyof TanDeltaHeader, string][]
            ).map(([key, label]) => (
              <div key={key} className="bg-white p-2">
                <Label className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</Label>
                <Input
                  className="h-9 px-2 text-sm"
                  type={key === "dateOfTesting" ? "date" : undefined}
                  inputMode={key === "impedance" ? "decimal" : undefined}
                  value={data.tanDeltaHeader[key]}
                  onChange={(e) => setTdHeader(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <SubTitle>Capacitance &amp; Tan Delta Measurement of HV Bushing</SubTitle>
          <p className="mb-1.5 text-[11px] text-slate-400">Entering the R-phase make fills all three phases.</p>
          <TableWrap minWidth={620}>
            <thead>
              <tr>
                <Th rowSpan={2} sticky>
                  #
                </Th>
                <Th rowSpan={2}>Parameters</Th>
                <Th colSpan={2} className="bg-slate-200">
                  R - Phase
                </Th>
                <Th colSpan={2} className="bg-slate-200">
                  Y - Phase
                </Th>
                <Th colSpan={2} className="bg-slate-200">
                  B - Phase
                </Th>
              </tr>
              <tr>
                <Th>2kV</Th>
                <Th>10kV</Th>
                <Th>2kV</Th>
                <Th>10kV</Th>
                <Th>2kV</Th>
                <Th>10kV</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <LabelCell className="text-center">—</LabelCell>
                <LabelCell>Make</LabelCell>
                {(["r", "y", "b"] as const).map((p) => (
                  <Td key={p} colSpan={2}>
                    <XInput inputMode="text" value={data.hvBushing[p].make} onChange={(v) => setBushing(p, "make", v)} />
                  </Td>
                ))}
              </tr>
              <tr>
                <LabelCell className="text-center">—</LabelCell>
                <LabelCell>Sr. No.</LabelCell>
                {(["r", "y", "b"] as const).map((p) => (
                  <Td key={p} colSpan={2}>
                    <XInput inputMode="text" value={data.hvBushing[p].srNo} onChange={(v) => setBushing(p, "srNo", v)} />
                  </Td>
                ))}
              </tr>
              <tr>
                <LabelCell className="text-center">1</LabelCell>
                <LabelCell>Capacitance in pF</LabelCell>
                {(["r", "y", "b"] as const).map((p) => (
                  <Fragment key={p}>
                    <Td>
                      <XInput value={data.hvBushing[p].cap2kv} onChange={(v) => setBushing(p, "cap2kv", v)} />
                    </Td>
                    <Td>
                      <XInput value={data.hvBushing[p].cap10kv} onChange={(v) => setBushing(p, "cap10kv", v)} />
                    </Td>
                  </Fragment>
                ))}
              </tr>
              <tr>
                <LabelCell className="text-center">2</LabelCell>
                <LabelCell>Dissipation Factor in %</LabelCell>
                {(["r", "y", "b"] as const).map((p) => (
                  <Fragment key={p}>
                    <Td>
                      <XInput value={data.hvBushing[p].df2kv} onChange={(v) => setBushing(p, "df2kv", v)} />
                    </Td>
                    <Td>
                      <XInput value={data.hvBushing[p].df10kv} onChange={(v) => setBushing(p, "df10kv", v)} />
                    </Td>
                  </Fragment>
                ))}
              </tr>
            </tbody>
          </TableWrap>

          <SubTitle>Capacitance &amp; Tan Delta Measurement of Windings</SubTitle>
          <TableWrap minWidth={680} addRow={addWindingTanDeltaRow}>
            <thead>
              <tr>
                <Th sticky>Sr. No.</Th>
                <Th>Name of Phase</Th>
                <Th>Test Mode</Th>
                <Th>Applied Voltage</Th>
                <Th>Capacitance in pF</Th>
                <Th>Dissipation Factor (%)</Th>
                <Th>Applied Voltage</Th>
                <Th>Capacitance in pF</Th>
                <Th>Dissipation Factor (%)</Th>
              </tr>
            </thead>
            <tbody>
              {data.windingTanDelta.map((row, i) => (
                <tr key={i}>
                  <Td sticky className="text-center text-xs font-semibold text-slate-600">
                    {i + 1}
                  </Td>
                   <Td>
                     <XInput inputMode="text" value={row.nameOfPhase} onChange={(v) => setTdRow(i, { nameOfPhase: v })} />
                   </Td>
                   <Td>
                     <XInput inputMode="text" value={row.testMode} onChange={(v) => setTdRow(i, { testMode: v })} />
                   </Td>
                  <Td>
                    <XInput inputMode="text" value={row.appliedVoltage1} onChange={(v) => setTdRow(i, { appliedVoltage1: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.cap1} onChange={(v) => setTdRow(i, { cap1: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.df1} onChange={(v) => setTdRow(i, { df1: v })} />
                  </Td>
                  <Td>
                    <XInput inputMode="text" value={row.appliedVoltage2} onChange={(v) => setTdRow(i, { appliedVoltage2: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.cap2} onChange={(v) => setTdRow(i, { cap2: v })} />
                  </Td>
                  <Td>
                    <XInput value={row.df2} onChange={(v) => setTdRow(i, { df2: v })} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <Field label="Remarks">
            <Input value={data.tanDeltaRemarks} onChange={(e) => patch({ tanDeltaRemarks: e.target.value })} placeholder="Result found normal." />
          </Field>
        </div>
      )}

      {/* Signatures ------------------------------------------------------ */}
      {tab === "sign" && (
        <SignatureFields
          values={data.signatures}
          onChange={(key, value) => patch({ signatures: { ...data.signatures, [key]: value } })}
          title="Tested By / Witness By"
        />
      )}
    </div>
  );
}

// Vector-group reading: turns green with a tick as soon as its relation matches.
function VectorField({
  label,
  value,
  ok,
  onChange,
}: {
  label: string;
  value: string;
  ok: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pr-8",
            ok && "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700 focus-visible:ring-emerald-500"
          )}
        />
        {ok ? (
          <CheckCircle2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
        ) : null}
      </div>
    </Field>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-semibold text-slate-600">{label}</Label>
      {children}
    </div>
  );
}
