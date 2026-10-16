"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sigma } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/lib/power-tr-types";

// ------------------------------------------------------------
// Local building blocks (mobile-first, matching the existing form language)
// ------------------------------------------------------------

function SheetSection({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 bg-slate-50/60 px-4 py-3.5 text-left transition active:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function NumCell({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode="decimal"
      className={`h-8 w-full min-w-[52px] rounded-md border border-slate-300 bg-white px-1.5 text-center text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${className ?? ""}`}
    />
  );
}

function CalcCell({ value }: { value: string }) {
  return (
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-sm font-medium text-slate-600">
      {value || "—"}
    </div>
  );
}

function GridTable({
  headers,
  minWidth,
  children,
}: {
  headers: string[];
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="rounded-lg border border-slate-200">
        <table className="w-full border-collapse" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-slate-100 px-1 py-1 align-middle ${className ?? ""}`}>{children}</td>
  );
}

function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-teal-600">
      <Sigma className="h-3 w-3" /> auto
    </span>
  );
}

// ------------------------------------------------------------
// Main form
// ------------------------------------------------------------

export function PowerTrForm({
  data,
  onChange,
}: {
  data: PowerTrData;
  onChange: (data: PowerTrData) => void;
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

  const h = data.header;

  return (
    <div className="space-y-3">
      {/* 1. Ratio Test ---------------------------------------------------- */}
      <SheetSection title="1. Ratio Test" subtitle="Tap-wise HV/LV ratio, actual ratio & % error" defaultOpen>
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Party Name">
            <Input value={h.partyName} onChange={(e) => setHeader("partyName", e.target.value)} placeholder="Party name" />
          </Field>
          <Field label="Name of Sub-Station">
            <Input value={h.substationName} onChange={(e) => setHeader("substationName", e.target.value)} placeholder="Sub-station" />
          </Field>
          <Field label="MVA Rating (in title)">
            <Input value={h.mva} onChange={(e) => setHeader("mva", e.target.value)} placeholder="e.g. 31.5" inputMode="decimal" />
          </Field>
          <Field label="Rating">
            <Input value={h.rating} onChange={(e) => setHeader("rating", e.target.value)} placeholder="Rating" />
          </Field>
          <Field label="Make">
            <Input value={h.make} onChange={(e) => setHeader("make", e.target.value)} />
          </Field>
          <Field label="Date of Testing">
            <Input type="date" value={h.dateOfTesting} onChange={(e) => setHeader("dateOfTesting", e.target.value)} />
          </Field>
          <Field label="Sr. No.">
            <Input value={h.srNo} onChange={(e) => setHeader("srNo", e.target.value)} />
          </Field>
          <Field label="% Impedance">
            <Input value={h.percentImpedance} onChange={(e) => setHeader("percentImpedance", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="HV Amp.">
            <Input value={h.hvAmp} onChange={(e) => setHeader("hvAmp", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="LV Amp.">
            <Input value={h.lvAmp} onChange={(e) => setHeader("lvAmp", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Vector Group">
            <Input value={h.vectorGroup} onChange={(e) => setHeader("vectorGroup", e.target.value)} placeholder="YNyn0" />
          </Field>
          <Field label="Qty. of Oil (Ltr.)">
            <Input value={h.qtyOfOil} onChange={(e) => setHeader("qtyOfOil", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="HV Volts">
            <Input value={h.hvVolts} onChange={(e) => setHeader("hvVolts", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="LV Volts">
            <Input value={h.lvVolts} onChange={(e) => setHeader("lvVolts", e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Year of Mfg.">
            <Input value={h.yearOfMfg} onChange={(e) => setHeader("yearOfMfg", e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center justify-end">
          <AutoBadge />
        </div>

        <GridTable
          headers={["Tap", "HV V", "LV V", "Cal. Ratio", "R Act.", "R %Err", "R mA", "Y Act.", "Y %Err", "Y mA", "B Act.", "B %Err", "B mA", "Max", "Min"]}
          minWidth={1080}
        >
          {data.ratio.map((row, i) => {
            const cal = calcCalRatio(row.hvVoltage, row.lvVoltage);
            return (
              <tr key={row.tap}>
                <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
                <Td><NumCell value={row.hvVoltage} onChange={(v) => setArr("ratio", i, { hvVoltage: v })} /></Td>
                <Td><NumCell value={row.lvVoltage} onChange={(v) => setArr("ratio", i, { lvVoltage: v })} /></Td>
                <Td><CalcCell value={fmt(cal, 4)} /></Td>
                <Td><NumCell value={row.rActualRatio} onChange={(v) => setArr("ratio", i, { rActualRatio: v })} /></Td>
                <Td><CalcCell value={fmt(calcRatioError(row.rActualRatio, cal), 3)} /></Td>
                <Td><NumCell value={row.rMa} onChange={(v) => setArr("ratio", i, { rMa: v })} /></Td>
                <Td><NumCell value={row.yActualRatio} onChange={(v) => setArr("ratio", i, { yActualRatio: v })} /></Td>
                <Td><CalcCell value={fmt(calcRatioError(row.yActualRatio, cal), 3)} /></Td>
                <Td><NumCell value={row.yMa} onChange={(v) => setArr("ratio", i, { yMa: v })} /></Td>
                <Td><NumCell value={row.bActualRatio} onChange={(v) => setArr("ratio", i, { bActualRatio: v })} /></Td>
                <Td><CalcCell value={fmt(calcRatioError(row.bActualRatio, cal), 3)} /></Td>
                <Td><NumCell value={row.bMa} onChange={(v) => setArr("ratio", i, { bMa: v })} /></Td>
                <Td><CalcCell value={fmt(calcMaxLimit(cal), 4)} /></Td>
                <Td><CalcCell value={fmt(calcMinLimit(cal), 4)} /></Td>
              </tr>
            );
          })}
        </GridTable>
      </SheetSection>

      {/* 2. Voltage Ratio Test ------------------------------------------- */}
      <SheetSection title="2. Voltage Ratio Test" subtitle="Tap-wise HV & LV voltage per phase">
        <GridTable headers={["Tap", "R HV", "R LV", "Y HV", "Y LV", "B HV", "B LV"]} minWidth={620}>
          {data.voltageRatio.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.rHv} onChange={(v) => setArr("voltageRatio", i, { rHv: v })} /></Td>
              <Td><NumCell value={row.rLv} onChange={(v) => setArr("voltageRatio", i, { rLv: v })} /></Td>
              <Td><NumCell value={row.yHv} onChange={(v) => setArr("voltageRatio", i, { yHv: v })} /></Td>
              <Td><NumCell value={row.yLv} onChange={(v) => setArr("voltageRatio", i, { yLv: v })} /></Td>
              <Td><NumCell value={row.bHv} onChange={(v) => setArr("voltageRatio", i, { bHv: v })} /></Td>
              <Td><NumCell value={row.bLv} onChange={(v) => setArr("voltageRatio", i, { bLv: v })} /></Td>
            </tr>
          ))}
        </GridTable>
      </SheetSection>

      {/* 3. Magnetic Balance / Short Circuit ------------------------------ */}
      <SheetSection title="3. MB Test / Short Circuit Test" subtitle="Magnetic balance (HV & LV) and 3-Ø short circuit">
        <p className="text-xs font-semibold text-slate-600">Magnetic Balance Test (HV Side) — 1-Ø applied on HV Side</p>
        <GridTable
          headers={["Tap", "Voltage Applied", "RN", "YN", "BN", "rn", "yn", "bn"]}
          minWidth={720}
        >
          {data.mbHv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.voltageApplied} onChange={(v) => setArr("mbHv", i, { voltageApplied: v })} /></Td>
              <Td><NumCell value={row.rn} onChange={(v) => setArr("mbHv", i, { rn: v })} /></Td>
              <Td><NumCell value={row.yn} onChange={(v) => setArr("mbHv", i, { yn: v })} /></Td>
              <Td><NumCell value={row.bn} onChange={(v) => setArr("mbHv", i, { bn: v })} /></Td>
              <Td><NumCell value={row.lvRn} onChange={(v) => setArr("mbHv", i, { lvRn: v })} /></Td>
              <Td><NumCell value={row.lvYn} onChange={(v) => setArr("mbHv", i, { lvYn: v })} /></Td>
              <Td><NumCell value={row.lvBn} onChange={(v) => setArr("mbHv", i, { lvBn: v })} /></Td>
            </tr>
          ))}
        </GridTable>

        <p className="text-xs font-semibold text-slate-600">Magnetic Balance Test (LV Side) — 1-Ø applied on LV Side</p>
        <GridTable headers={["Tap", "Voltage Applied", "rn", "yn", "bn"]} minWidth={420}>
          {data.mbLv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.voltageApplied} onChange={(v) => setArr("mbLv", i, { voltageApplied: v })} /></Td>
              <Td><NumCell value={row.rn} onChange={(v) => setArr("mbLv", i, { rn: v })} /></Td>
              <Td><NumCell value={row.yn} onChange={(v) => setArr("mbLv", i, { yn: v })} /></Td>
              <Td><NumCell value={row.bn} onChange={(v) => setArr("mbLv", i, { bn: v })} /></Td>
            </tr>
          ))}
        </GridTable>

        <p className="text-xs font-semibold text-slate-600">Short Circuit Test — 3-Ø applied on HV Side & Secondary Shorted</p>
        <GridTable headers={["Tap", "HV R", "HV Y", "HV B", "LV r", "LV y", "LV b", "n (mA)"]} minWidth={680}>
          {data.shortCircuit.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.hvR} onChange={(v) => setArr("shortCircuit", i, { hvR: v })} /></Td>
              <Td><NumCell value={row.hvY} onChange={(v) => setArr("shortCircuit", i, { hvY: v })} /></Td>
              <Td><NumCell value={row.hvB} onChange={(v) => setArr("shortCircuit", i, { hvB: v })} /></Td>
              <Td><NumCell value={row.lvR} onChange={(v) => setArr("shortCircuit", i, { lvR: v })} /></Td>
              <Td><NumCell value={row.lvY} onChange={(v) => setArr("shortCircuit", i, { lvY: v })} /></Td>
              <Td><NumCell value={row.lvB} onChange={(v) => setArr("shortCircuit", i, { lvB: v })} /></Td>
              <Td><NumCell value={row.lvN} onChange={(v) => setArr("shortCircuit", i, { lvN: v })} /></Td>
            </tr>
          ))}
        </GridTable>
      </SheetSection>

      {/* 4. Charging Current ---------------------------------------------- */}
      <SheetSection title="4. Charging Current" subtitle="Magnetizing current (mA) — 440V applied">
        <p className="text-xs font-semibold text-slate-600">Magnetizing Current Test (HV Side) — 440V applied on HV Side</p>
        <GridTable headers={["Tap", "R (mA)", "Y (mA)", "B (mA)"]} minWidth={420}>
          {data.chargingHv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.r} onChange={(v) => setArr("chargingHv", i, { r: v })} /></Td>
              <Td><NumCell value={row.y} onChange={(v) => setArr("chargingHv", i, { y: v })} /></Td>
              <Td><NumCell value={row.b} onChange={(v) => setArr("chargingHv", i, { b: v })} /></Td>
            </tr>
          ))}
        </GridTable>

        <p className="text-xs font-semibold text-slate-600">Magnetizing Current Test (LV Side) — 440V applied on LV Side</p>
        <GridTable headers={["Tap", "R (mA)", "Y (mA)", "B (mA)"]} minWidth={420}>
          {data.chargingLv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.r} onChange={(v) => setArr("chargingLv", i, { r: v })} /></Td>
              <Td><NumCell value={row.y} onChange={(v) => setArr("chargingLv", i, { y: v })} /></Td>
              <Td><NumCell value={row.b} onChange={(v) => setArr("chargingLv", i, { b: v })} /></Td>
            </tr>
          ))}
        </GridTable>
      </SheetSection>

      {/* 5. Winding Resistance -------------------------------------------- */}
      <SheetSection title="5. Winding Resistance" subtitle="Winding resistance (mΩ)">
        <p className="text-xs font-semibold text-slate-600">HV Winding</p>
        <GridTable headers={["Tap", "R-Y", "Y-B", "B-R"]} minWidth={420}>
          {data.windingHv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.ry} onChange={(v) => setArr("windingHv", i, { ry: v })} /></Td>
              <Td><NumCell value={row.yb} onChange={(v) => setArr("windingHv", i, { yb: v })} /></Td>
              <Td><NumCell value={row.br} onChange={(v) => setArr("windingHv", i, { br: v })} /></Td>
            </tr>
          ))}
        </GridTable>

        <p className="text-xs font-semibold text-slate-600">LV Winding</p>
        <GridTable headers={["Tap", "r-y", "y-b", "b-r"]} minWidth={420}>
          {data.windingLv.map((row, i) => (
            <tr key={row.tap}>
              <Td className="text-center text-xs font-semibold text-slate-600">{row.tap}</Td>
              <Td><NumCell value={row.ry} onChange={(v) => setArr("windingLv", i, { ry: v })} /></Td>
              <Td><NumCell value={row.yb} onChange={(v) => setArr("windingLv", i, { yb: v })} /></Td>
              <Td><NumCell value={row.br} onChange={(v) => setArr("windingLv", i, { br: v })} /></Td>
            </tr>
          ))}
        </GridTable>
      </SheetSection>

      {/* 6. Vector Group / IR / BDV --------------------------------------- */}
      <SheetSection title="6. Vector Group / IR Value / BDV" subtitle="Vector group check, IR (GΩ) and oil BDV (kV)">
        <p className="text-xs font-semibold text-slate-600">Vector Group Check (3-Ø applied on HV Side & R-r Shorted)</p>
        <div className="grid grid-cols-2 gap-3 min-w-0 sm:grid-cols-3 [&>*]:min-w-0">
          <Field label="Yy (V)"><Input inputMode="decimal" value={data.vectorGroup.yy} onChange={(e) => setVector("yy", e.target.value)} /></Field>
          <Field label="Rn (V)"><Input inputMode="decimal" value={data.vectorGroup.rn} onChange={(e) => setVector("rn", e.target.value)} /></Field>
          <Field label="Bb (V)"><Input inputMode="decimal" value={data.vectorGroup.bb} onChange={(e) => setVector("bb", e.target.value)} /></Field>
          <Field label="nN (V)"><Input inputMode="decimal" value={data.vectorGroup.nn} onChange={(e) => setVector("nn", e.target.value)} /></Field>
          <Field label="Yb (V)"><Input inputMode="decimal" value={data.vectorGroup.yb} onChange={(e) => setVector("yb", e.target.value)} /></Field>
          <Field label="RN (V)"><Input inputMode="decimal" value={data.vectorGroup.rnUpper} onChange={(e) => setVector("rnUpper", e.target.value)} /></Field>
        </div>
        <p className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
          YNyn0 : Bb = Yy &nbsp;OR&nbsp; Rn + nN = RN &nbsp;→&nbsp; Result: YNyn0 Vector Group is Confirmed.
        </p>

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">IR Value of Power Transformer</p>
          <AutoBadge />
        </div>
        <GridTable headers={["Description", "Voltage", "1 Min (GΩ)", "10 Min (GΩ)", "PI"]} minWidth={480}>
          {data.ir.map((row, i) => (
            <tr key={`${row.description}-${i}`}>
              <Td className="whitespace-nowrap text-xs font-semibold text-slate-600">{row.description}</Td>
              <Td><NumCell value={row.voltage} onChange={(v) => setIr(i, { voltage: v })} /></Td>
              <Td><NumCell value={row.oneMin} onChange={(v) => setIr(i, { oneMin: v })} /></Td>
              <Td><NumCell value={row.tenMin} onChange={(v) => setIr(i, { tenMin: v })} /></Td>
              <Td><CalcCell value={fmt(calcPi(row.oneMin, row.tenMin), 3)} /></Td>
            </tr>
          ))}
        </GridTable>

        <p className="text-xs font-semibold text-slate-600">IR Tester (Megger) Details</p>
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-3 [&>*]:min-w-0">
          <Field label="Make"><Input value={data.megger.make} onChange={(e) => setMegger("make", e.target.value)} /></Field>
          <Field label="Sr. No."><Input value={data.megger.srNo} onChange={(e) => setMegger("srNo", e.target.value)} /></Field>
          <Field label="Voltage"><Input value={data.megger.voltage} onChange={(e) => setMegger("voltage", e.target.value)} /></Field>
        </div>

        <p className="text-xs font-semibold text-slate-600">BDV Test of Oil (kV)</p>
        <GridTable headers={["Description", "Before Filtration", "After Filtration"]} minWidth={460}>
          {data.bdv.map((row, i) => (
            <tr key={`${row.description}-${i}`}>
              <Td className="whitespace-nowrap text-xs font-semibold text-slate-600">{row.description}</Td>
              <Td><NumCell value={row.before} onChange={(v) => setBdv(i, { before: v })} /></Td>
              <Td><NumCell value={row.after} onChange={(v) => setBdv(i, { after: v })} /></Td>
            </tr>
          ))}
        </GridTable>
      </SheetSection>

      {/* 7. Tan Delta ------------------------------------------------------ */}
      <SheetSection title="7. Tan Delta" subtitle="Capacitance & dissipation factor (bushing + windings)">
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Name of S/S"><Input value={data.tanDeltaHeader.nameOfSs} onChange={(e) => setTdHeader("nameOfSs", e.target.value)} /></Field>
          <Field label="Date of Testing"><Input type="date" value={data.tanDeltaHeader.dateOfTesting} onChange={(e) => setTdHeader("dateOfTesting", e.target.value)} /></Field>
          <Field label="Name of Equipment"><Input value={data.tanDeltaHeader.nameOfEquipment} onChange={(e) => setTdHeader("nameOfEquipment", e.target.value)} /></Field>
          <Field label="Vector Group"><Input value={data.tanDeltaHeader.vectorGroup} onChange={(e) => setTdHeader("vectorGroup", e.target.value)} /></Field>
          <Field label="Make"><Input value={data.tanDeltaHeader.make} onChange={(e) => setTdHeader("make", e.target.value)} /></Field>
          <Field label="MFG Year"><Input value={data.tanDeltaHeader.mfgYear} onChange={(e) => setTdHeader("mfgYear", e.target.value)} /></Field>
          <Field label="Serial No"><Input value={data.tanDeltaHeader.serialNo} onChange={(e) => setTdHeader("serialNo", e.target.value)} /></Field>
          <Field label="Ambient Temperature"><Input value={data.tanDeltaHeader.ambientTemp} onChange={(e) => setTdHeader("ambientTemp", e.target.value)} /></Field>
          <Field label="OTI"><Input value={data.tanDeltaHeader.oti} onChange={(e) => setTdHeader("oti", e.target.value)} /></Field>
          <Field label="WTI"><Input value={data.tanDeltaHeader.wti} onChange={(e) => setTdHeader("wti", e.target.value)} /></Field>
          <Field label="Humidity"><Input value={data.tanDeltaHeader.humidity} onChange={(e) => setTdHeader("humidity", e.target.value)} /></Field>
          <Field label="Impedance (%)"><Input inputMode="decimal" value={data.tanDeltaHeader.impedance} onChange={(e) => setTdHeader("impedance", e.target.value)} /></Field>
        </div>

        <p className="text-xs font-semibold text-slate-600">Capacitance & Tan Delta Measurement of HV Bushing</p>
        {(["r", "y", "b"] as const).map((phase) => (
          <div key={phase} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{phase}-Phase</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Field label="Make"><Input value={data.hvBushing[phase].make} onChange={(e) => setBushing(phase, "make", e.target.value)} /></Field>
              <Field label="Sr. No."><Input value={data.hvBushing[phase].srNo} onChange={(e) => setBushing(phase, "srNo", e.target.value)} /></Field>
              <Field label="Cap @ 2kV (pF)"><Input inputMode="decimal" value={data.hvBushing[phase].cap2kv} onChange={(e) => setBushing(phase, "cap2kv", e.target.value)} /></Field>
              <Field label="Cap @ 10kV (pF)"><Input inputMode="decimal" value={data.hvBushing[phase].cap10kv} onChange={(e) => setBushing(phase, "cap10kv", e.target.value)} /></Field>
              <Field label="DF @ 2kV (%)"><Input inputMode="decimal" value={data.hvBushing[phase].df2kv} onChange={(e) => setBushing(phase, "df2kv", e.target.value)} /></Field>
              <Field label="DF @ 10kV (%)"><Input inputMode="decimal" value={data.hvBushing[phase].df10kv} onChange={(e) => setBushing(phase, "df10kv", e.target.value)} /></Field>
            </div>
          </div>
        ))}

        <p className="text-xs font-semibold text-slate-600">Capacitance & Tan Delta Measurement of Windings</p>
        <GridTable
          headers={["Name of Phase", "Test Mode", "V1", "Cap (pF)", "DF (%)", "V2", "Cap (pF)", "DF (%)"]}
          minWidth={720}
        >
          {data.windingTanDelta.map((row, i) => (
            <tr key={i}>
              <Td className="whitespace-nowrap text-xs font-semibold text-slate-600">{row.nameOfPhase}</Td>
              <Td className="whitespace-nowrap text-xs text-slate-500">{row.testMode}</Td>
              <Td><NumCell value={row.appliedVoltage1} onChange={(v) => setTdRow(i, { appliedVoltage1: v })} /></Td>
              <Td><NumCell value={row.cap1} onChange={(v) => setTdRow(i, { cap1: v })} /></Td>
              <Td><NumCell value={row.df1} onChange={(v) => setTdRow(i, { df1: v })} /></Td>
              <Td><NumCell value={row.appliedVoltage2} onChange={(v) => setTdRow(i, { appliedVoltage2: v })} /></Td>
              <Td><NumCell value={row.cap2} onChange={(v) => setTdRow(i, { cap2: v })} /></Td>
              <Td><NumCell value={row.df2} onChange={(v) => setTdRow(i, { df2: v })} /></Td>
            </tr>
          ))}
        </GridTable>

        <Field label="Remarks">
          <Input value={data.tanDeltaRemarks} onChange={(e) => patch({ tanDeltaRemarks: e.target.value })} placeholder="Result found normal." />
        </Field>
      </SheetSection>

      {/* Signatures ------------------------------------------------------ */}
      <SheetSection title="Tested By / Witness By" subtitle="Shown on every sheet of the PDF">
        <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Tested By">
            <Input value={data.signatures.testedBy} onChange={(e) => patch({ signatures: { ...data.signatures, testedBy: e.target.value } })} placeholder="Name / names" />
          </Field>
          <Field label="Witness By">
            <Input value={data.signatures.witnessBy} onChange={(e) => patch({ signatures: { ...data.signatures, witnessBy: e.target.value } })} placeholder="Witness name / company" />
          </Field>
        </div>
      </SheetSection>
    </div>
  );
}
