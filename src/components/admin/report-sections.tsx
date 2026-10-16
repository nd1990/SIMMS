import type { ReportPayload } from "@/lib/report-types";
import {
  POWER_TR_TEMPLATE_CODE,
  type PowerTrData,
  calcCalRatio,
  calcMaxLimit,
  calcMinLimit,
  calcPi,
  calcRatioError,
  fmt,
} from "@/lib/power-tr-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KeyValueGrid({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data).filter(([, v]) => v);
  if (entries.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">No data recorded</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-slate-500 dark:text-slate-400">{humanize(k)}</dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function RowsTable({ rows }: { rows: Record<string, string>[] }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">No data recorded</p>;
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k]))));
  if (keys.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">No data recorded</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {keys.map((k) => (
              <TableHead key={k}>{humanize(k)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {keys.map((k) => (
                <TableCell key={k}>{r[k] || "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function ReportSections({ payload }: { payload: ReportPayload }) {
  const sections: { title: string; node: React.ReactNode }[] = [];

  if (payload.templateCode === POWER_TR_TEMPLATE_CODE && payload.powerTr) {
    return <PowerTrSections data={payload.powerTr} />;
  }

  if (payload.templateCode === "66KV_CT") {
    sections.push({ title: "Test Checklist", node: <RowsTable rows={(payload.checklist ?? []).map((r) => ({ ...r, status: r.status })) as any} /> });
  } else {
    if (payload.specifications) sections.push({ title: "CT Specification", node: <KeyValueGrid data={payload.specifications as any} /> });
    if (payload.cores?.length) sections.push({ title: "Core Details", node: <RowsTable rows={payload.cores as any} /> });
    if (payload.capacitance?.length) sections.push({ title: "Capacitance & Tan Delta", node: <RowsTable rows={payload.capacitance as any} /> });
    if (payload.insulation?.length) sections.push({ title: "Insulation Resistance", node: <RowsTable rows={payload.insulation as any} /> });
    if (payload.winding?.length) sections.push({ title: "Winding Resistance", node: <RowsTable rows={payload.winding as any} /> });
    if (payload.polarity?.length) sections.push({ title: "Polarity", node: <RowsTable rows={payload.polarity as any} /> });
    if (payload.coreIdentification?.length) sections.push({ title: "Core Identification", node: <RowsTable rows={payload.coreIdentification as any} /> });
    if (payload.ratio?.length) sections.push({ title: "Ratio Test", node: <RowsTable rows={payload.ratio as any} /> });
    if (payload.kneePoint?.length) sections.push({ title: "KV Point Test", node: <RowsTable rows={payload.kneePoint as any} /> });
    if (payload.connection && Object.values(payload.connection).some(Boolean)) sections.push({ title: "CT Connection", node: <KeyValueGrid data={payload.connection as any} /> });
    if (payload.series?.length) sections.push({ title: "CT Series Test", node: <RowsTable rows={payload.series as any} /> });
    if (payload.meteringProtection?.length) sections.push({ title: "Metering & Protection Core", node: <RowsTable rows={payload.meteringProtection as any} /> });
  }

  if (sections.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">No test data recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <SectionCard key={s.title} title={s.title}>
          {s.node}
        </SectionCard>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Power Transformer (Star-Star) — read-only rendering
// ------------------------------------------------------------

function MiniTable({ headers, rows }: { headers: string[]; rows: (string | undefined)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">No data recorded</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell || "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PowerTrSections({ data }: { data: PowerTrData }) {
  const h = data.header;
  const hdr: [string, string][] = [
    ["Party Name", h.partyName],
    ["Sub-Station", h.substationName],
    ["MVA", h.mva],
    ["Rating", h.rating],
    ["Make", h.make],
    ["Date of Testing", h.dateOfTesting],
    ["Sr. No.", h.srNo],
    ["% Impedance", h.percentImpedance],
    ["HV Amp.", h.hvAmp],
    ["LV Amp.", h.lvAmp],
    ["Vector Group", h.vectorGroup],
    ["Qty. of Oil", h.qtyOfOil],
    ["HV Volts", h.hvVolts],
    ["LV Volts", h.lvVolts],
    ["Year of Mfg.", h.yearOfMfg],
  ];

  const sections: { title: string; node: React.ReactNode }[] = [
    {
      title: "Transformer Details",
      node: <KeyValueGrid data={Object.fromEntries(hdr.filter(([, v]) => v))} />,
    },
    {
      title: "1. Ratio Test",
      node: (
        <MiniTable
          headers={["Tap", "HV V", "LV V", "Cal. Ratio", "R Act.", "R %Err", "Y Act.", "Y %Err", "B Act.", "B %Err", "Max", "Min"]}
          rows={data.ratio.map((r) => {
            const cal = calcCalRatio(r.hvVoltage, r.lvVoltage);
            return [
              String(r.tap),
              r.hvVoltage,
              r.lvVoltage,
              fmt(cal, 4),
              r.rActualRatio,
              fmt(calcRatioError(r.rActualRatio, cal), 3),
              r.yActualRatio,
              fmt(calcRatioError(r.yActualRatio, cal), 3),
              r.bActualRatio,
              fmt(calcRatioError(r.bActualRatio, cal), 3),
              fmt(calcMaxLimit(cal), 4),
              fmt(calcMinLimit(cal), 4),
            ];
          })}
        />
      ),
    },
    {
      title: "2. Voltage Ratio Test",
      node: (
        <MiniTable
          headers={["Tap", "R HV", "R LV", "Y HV", "Y LV", "B HV", "B LV"]}
          rows={data.voltageRatio.map((r) => [String(r.tap), r.rHv, r.rLv, r.yHv, r.yLv, r.bHv, r.bLv])}
        />
      ),
    },
    {
      title: "3. Magnetic Balance Test (HV Side)",
      node: (
        <MiniTable
          headers={["Tap", "Voltage Applied", "RN", "YN", "BN", "rn", "yn", "bn"]}
          rows={data.mbHv.map((r) => [String(r.tap), r.voltageApplied, r.rn, r.yn, r.bn, r.lvRn, r.lvYn, r.lvBn])}
        />
      ),
    },
    {
      title: "3. Magnetic Balance Test (LV Side)",
      node: <MiniTable headers={["Tap", "Voltage Applied", "rn", "yn", "bn"]} rows={data.mbLv.map((r) => [String(r.tap), r.voltageApplied, r.rn, r.yn, r.bn])} />,
    },
    {
      title: "3. Short Circuit Test",
      node: (
        <MiniTable
          headers={["Tap", "HV R", "HV Y", "HV B", "LV r", "LV y", "LV b", "n (mA)"]}
          rows={data.shortCircuit.map((r) => [String(r.tap), r.hvR, r.hvY, r.hvB, r.lvR, r.lvY, r.lvB, r.lvN])}
        />
      ),
    },
    {
      title: "4. Charging Current (HV Side)",
      node: <MiniTable headers={["Tap", "R (mA)", "Y (mA)", "B (mA)"]} rows={data.chargingHv.map((r) => [String(r.tap), r.r, r.y, r.b])} />,
    },
    {
      title: "4. Charging Current (LV Side)",
      node: <MiniTable headers={["Tap", "R (mA)", "Y (mA)", "B (mA)"]} rows={data.chargingLv.map((r) => [String(r.tap), r.r, r.y, r.b])} />,
    },
    {
      title: "5. Winding Resistance (HV)",
      node: <MiniTable headers={["Tap", "R-Y", "Y-B", "B-R"]} rows={data.windingHv.map((r) => [String(r.tap), r.ry, r.yb, r.br])} />,
    },
    {
      title: "5. Winding Resistance (LV)",
      node: <MiniTable headers={["Tap", "r-y", "y-b", "b-r"]} rows={data.windingLv.map((r) => [String(r.tap), r.ry, r.yb, r.br])} />,
    },
    {
      title: "6. Vector Group Check",
      node: (
        <KeyValueGrid
          data={{
            Yy: data.vectorGroup.yy,
            Rn: data.vectorGroup.rn,
            Bb: data.vectorGroup.bb,
            nN: data.vectorGroup.nn,
            Yb: data.vectorGroup.yb,
            RN: data.vectorGroup.rnUpper,
          }}
        />
      ),
    },
    {
      title: "6. IR Value",
      node: (
        <MiniTable
          headers={["Description", "Voltage", "1 Min (GΩ)", "10 Min (GΩ)", "PI"]}
          rows={data.ir.map((r) => [r.description, r.voltage, r.oneMin, r.tenMin, fmt(calcPi(r.oneMin, r.tenMin), 3)])}
        />
      ),
    },
    {
      title: "6. IR Tester (Megger)",
      node: <KeyValueGrid data={{ Make: data.megger.make, "Sr. No.": data.megger.srNo, Voltage: data.megger.voltage }} />,
    },
    {
      title: "6. BDV Test of Oil",
      node: <MiniTable headers={["Description", "Before Filtration", "After Filtration"]} rows={data.bdv.map((r) => [r.description, r.before, r.after])} />,
    },
    {
      title: "7. Tan Delta — HV Bushing",
      node: (
        <MiniTable
          headers={["Phase", "Make", "Sr. No.", "Cap @2kV", "Cap @10kV", "DF @2kV", "DF @10kV"]}
          rows={(["r", "y", "b"] as const).map((p) => {
            const b = data.hvBushing[p];
            return [p.toUpperCase(), b.make, b.srNo, b.cap2kv, b.cap10kv, b.df2kv, b.df10kv];
          })}
        />
      ),
    },
    {
      title: "7. Tan Delta — Windings",
      node: (
        <MiniTable
          headers={["Name of Phase", "Test Mode", "V1", "Cap (pF)", "DF (%)", "V2", "Cap (pF)", "DF (%)"]}
          rows={data.windingTanDelta.map((r) => [r.nameOfPhase, r.testMode, r.appliedVoltage1, r.cap1, r.df1, r.appliedVoltage2, r.cap2, r.df2])}
        />
      ),
    },
    {
      title: "Signatures",
      node: <KeyValueGrid data={{ "Tested By": data.signatures.testedBy, "Witness By": data.signatures.witnessBy }} />,
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <SectionCard key={s.title} title={s.title}>
          {s.node}
        </SectionCard>
      ))}
    </div>
  );
}