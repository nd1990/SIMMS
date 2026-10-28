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
import { stampForName, withBasePath } from "@/lib/employee-stamps";
import {
  CB_NAMEPLATE_FIELDS,
  CB_TEMPLATE_CODE,
  MCT_CORE_FIELDS,
  MCT_NAMEPLATE_FIELDS,
  MCT_TEMPLATE_CODE,
  MPT_TEMPLATE_CODE,
  PCT_NAMEPLATE_FIELDS,
  PCT_TEMPLATE_CODE,
  PPT_TEMPLATE_CODE,
  PT_NAMEPLATE_FIELDS,
  toNum,
  type CbData,
  type EquipmentHeader,
  type MctData,
  type PctData,
  type PtData,
} from "@/lib/equipment-types";
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

export function ReportSections({ payload, testedByStamp }: { payload: ReportPayload; testedByStamp?: string | null }) {
  const sections: { title: string; node: React.ReactNode }[] = [];

  if (payload.templateCode === POWER_TR_TEMPLATE_CODE && payload.powerTr) {
    return <PowerTrSections data={payload.powerTr} testedByStamp={testedByStamp} />;
  }

  if (payload.templateCode === CB_TEMPLATE_CODE && payload.cb) {
    return <CbSections data={payload.cb} testedByStamp={testedByStamp} />;
  }

  if (payload.templateCode === MCT_TEMPLATE_CODE && payload.mct) {
    return <MctSections data={payload.mct} testedByStamp={testedByStamp} />;
  }

  if (payload.templateCode === PCT_TEMPLATE_CODE && payload.pct) {
    return <PctSections data={payload.pct} testedByStamp={testedByStamp} />;
  }

  if ((payload.templateCode === MPT_TEMPLATE_CODE && payload.mpt) || (payload.templateCode === PPT_TEMPLATE_CODE && payload.ppt)) {
    return <PtSections data={(payload.mpt || payload.ppt) as PtData} testedByStamp={testedByStamp} />;
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
// 66 KV CB / MCT / PCT — read-only rendering
// ------------------------------------------------------------

function headerEntries(h: EquipmentHeader): Record<string, string> {
  return Object.fromEntries(
    (
      [
        ["Party Name", h.partyName],
        ["Switch Yard", h.switchYard],
        ["Project Name", h.projectName],
        ["EPC / Contractor", h.epcBy],
        ["Name of Site", h.siteName],
        ["Date of Testing", h.dateOfTesting],
        ["Equipment Name", h.equipmentName],
        ["Sr. No.", h.srNo],
      ] as [string, string][]
    ).filter(([, value]) => String(value ?? "").trim() !== "")
  );
}

function namePlateEntries<T extends Record<string, string>>(
  fields: { key: keyof T; label: string }[],
  data: T
): [string, string][] {
  return fields
    .map((field) => [field.label, data[field.key] ?? ""] as [string, string])
    .filter(([, value]) => String(value ?? "").trim() !== "");
}

function hasRow(rows: (string | undefined)[][]): boolean {
  return rows.some((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
}

function EquipmentSignatures({
  testedBy,
  witnessBy,
  remarks,
  testedByStamp,
}: {
  testedBy: string;
  witnessBy: string;
  remarks?: string;
  testedByStamp?: string | null;
}) {
  return (
    <div className="space-y-3">
      {stampForName(testedBy, testedByStamp) ? (
        <img
          src={withBasePath(stampForName(testedBy, testedByStamp)!)}
          alt="Stamp"
          className="h-16 w-auto object-contain"
        />
      ) : null}
      <KeyValueGrid data={{ "Tested By": testedBy, "Witness By": witnessBy }} />
      {remarks ? <p className="text-sm text-slate-600 dark:text-slate-300">Remarks: {remarks}</p> : null}
    </div>
  );
}

function CbSections({ data, testedByStamp }: { data: CbData; testedByStamp?: string | null }) {
  const sections: { title: string; node: React.ReactNode }[] = [];
  const header = headerEntries(data.header);
  if (Object.keys(header).length) sections.push({ title: "Test Details", node: <KeyValueGrid data={header} /> });

  const namePlate = namePlateEntries(CB_NAMEPLATE_FIELDS, data.namePlate);
  if (namePlate.length) sections.push({ title: "Name Plate", node: <KeyValueGrid data={Object.fromEntries(namePlate)} /> });

  const srNos = data.breakerSrNos.filter((r) => r.srNo || r.description);
  if (srNos.length) {
    sections.push({
      title: "Breaker Serial Numbers",
      node: <MiniTable headers={["Description", "Sr. No."]} rows={srNos.map((r) => [r.description, r.srNo])} />,
    });
  }

  const irOff = data.irOff.map((r) => [r.phase, r.aB, r.bC, r.aC]);
  if (hasRow(irOff)) {
    sections.push({ title: "IR Value (Breaker OFF)", node: <MiniTable headers={["Phase", "A-B", "B-C", "A-C"]} rows={irOff} /> });
  }
  const irOn = data.irOn.map((r) => [r.phase, r.aB, r.bC, r.aC]);
  if (hasRow(irOn)) {
    sections.push({ title: "IR Value (Breaker ON)", node: <MiniTable headers={["Phase", "A-B", "B-C", "A-C"]} rows={irOn} /> });
  }

  const ops = data.operations.filter((r) => r.mechanically || r.electricalLocal || r.electricalRemote);
  if (ops.length) {
    sections.push({
      title: "Operation Checks",
      node: (
        <MiniTable
          headers={["Operation", "Mechanically", "Electrical Local", "Electrical Remote"]}
          rows={ops.map((r) => [r.operation, r.mechanically, r.electricalLocal, r.electricalRemote])}
        />
      ),
    });
  }

  const ind = data.indications.filter((r) => r.statusInCrp);
  if (ind.length) {
    sections.push({ title: "Indications", node: <MiniTable headers={["Description", "Status in CRP"]} rows={ind.map((r) => [r.description, r.statusInCrp])} /> });
  }

  const relays = data.relayStatus.filter((r) => r.statusInRelay || r.ledInRelay);
  if (relays.length) {
    sections.push({
      title: "Relay Status",
      node: (
        <MiniTable
          headers={["Relay", "Description", "Status in Relay", "LED in Relay"]}
          rows={relays.map((r) => [r.relay, r.description, r.statusInRelay, r.ledInRelay])}
        />
      ),
    });
  }

  const crm = data.crm
    .map((r) => {
      const values = [toNum(r.value1), toNum(r.value2), toNum(r.value3)].filter((n): n is number => n !== null);
      const avg = values.length ? fmt(values.reduce((a, b) => a + b, 0) / values.length, 2) : "";
      return [r.phase, r.value1, r.value2, r.value3, avg];
    })
    .filter((row) => row.slice(1).some(Boolean));
  if (crm.length) {
    sections.push({ title: "Contact Resistance (CRM)", node: <MiniTable headers={["Phase", "Value 1", "Value 2", "Value 3", "Average"]} rows={crm} /> });
  }

  const timing = data.timing.filter((r) => r.r || r.y || r.b);
  if (timing.length) {
    sections.push({ title: "Timing Test", node: <MiniTable headers={["Test", "R", "Y", "B"]} rows={timing.map((r) => [r.test, r.r, r.y, r.b])} /> });
  }

  const coil = data.coil.filter((r) => r.resistance || r.current);
  if (coil.length) {
    sections.push({
      title: "Coil Resistance & Current",
      node: <MiniTable headers={["Location", "Resistance (Ohm)", "Current (A)"]} rows={coil.map((r) => [r.location, r.resistance, r.current])} />,
    });
  }

  const spring = Object.fromEntries(
    (
      [
        ["Spring Charge Time (Sec)", data.springCharge.time],
        ["Spring Charge Current (A)", data.springCharge.amp],
        ["AC Voltage", data.springCharge.acVoltage],
        ["DC Voltage", data.springCharge.dcVoltage],
      ] as [string, string][]
    ).filter(([, value]) => value)
  );
  if (Object.keys(spring).length) sections.push({ title: "Spring Charge & Control Voltage", node: <KeyValueGrid data={spring} /> });

  sections.push({
    title: "Signatures",
    node: <EquipmentSignatures testedBy={data.signatures.testedBy} witnessBy={data.signatures.witnessBy} remarks={data.remarks} testedByStamp={testedByStamp} />,
  });

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

function MctSections({ data, testedByStamp }: { data: MctData; testedByStamp?: string | null }) {
  const sections: { title: string; node: React.ReactNode }[] = [];
  const header = headerEntries(data.header);
  if (Object.keys(header).length) sections.push({ title: "Test Details", node: <KeyValueGrid data={header} /> });

  const namePlate = namePlateEntries(MCT_NAMEPLATE_FIELDS, data.namePlate);
  if (namePlate.length) sections.push({ title: "Name Plate", node: <KeyValueGrid data={Object.fromEntries(namePlate)} /> });

  const core = namePlateEntries(MCT_CORE_FIELDS, data.core);
  if (core.length) sections.push({ title: "Core Details", node: <KeyValueGrid data={Object.fromEntries(core)} /> });

  const ratings = data.ratings.map((r) => [r.particular, r.r, r.y, r.b]);
  if (hasRow(ratings)) {
    sections.push({ title: "Capacitance & Tan Delta", node: <MiniTable headers={["Particular", "R", "Y", "B"]} rows={ratings} /> });
  }

  const ir = data.ir.map((r) => [r.testType, r.meggerUsed, r.r, r.y, r.b]);
  if (hasRow(ir)) {
    sections.push({ title: "Insulation Resistance", node: <MiniTable headers={["Test", "Megger", "R", "Y", "B"]} rows={ir} /> });
  }

  const winding = data.winding.map((r) => [r.connection, r.r, r.y, r.b]);
  if (hasRow(winding)) {
    sections.push({ title: "Secondary Winding Resistance", node: <MiniTable headers={["Connection", "R", "Y", "B"]} rows={winding} /> });
  }

  const polarity = data.polarity.map((r) => [r.phase, r.core1]);
  if (hasRow(polarity)) {
    sections.push({ title: "Polarity Test", node: <MiniTable headers={["Phase", "Core - 1"]} rows={polarity} /> });
  }

  const ratio = data.ratio.map((r) => [r.phase, r.injectedCurrent, r.measured]);
  if (hasRow(ratio)) {
    sections.push({ title: "Ratio Test", node: <MiniTable headers={["Phase", "Injected (A)", "Measured (A)"]} rows={ratio} /> });
  }

  const connection = Object.fromEntries(
    (
      [
        ["P1 Side", data.connection.p1Side],
        ["P2 Side", data.connection.p2Side],
      ] as [string, string][]
    ).filter(([, value]) => value)
  );
  const series = [[data.series.injectedPrimary, data.series.ratio, data.series.r, data.series.y, data.series.b]];
  if (Object.keys(connection).length) sections.push({ title: "CT Connection", node: <KeyValueGrid data={connection} /> });
  if (hasRow(series)) {
    sections.push({
      title: "Series Test",
      node: <MiniTable headers={["Injected Primary (A)", "Ratio", "R", "Y", "B"]} rows={series} />,
    });
  }

  sections.push({
    title: "Signatures",
    node: <EquipmentSignatures testedBy={data.signatures.testedBy} witnessBy={data.signatures.witnessBy} remarks={data.remarks} testedByStamp={testedByStamp} />,
  });

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

function PctSections({ data, testedByStamp }: { data: PctData; testedByStamp?: string | null }) {
  const sections: { title: string; node: React.ReactNode }[] = [];
  const header = headerEntries(data.header);
  if (Object.keys(header).length) sections.push({ title: "Test Details", node: <KeyValueGrid data={header} /> });

  const namePlate = namePlateEntries(PCT_NAMEPLATE_FIELDS, data.namePlate);
  if (namePlate.length) sections.push({ title: "Name Plate", node: <KeyValueGrid data={Object.fromEntries(namePlate)} /> });

  const coreRows = data.cores.map((c) => [
    c.coreName,
    c.primaryRatio,
    c.secondaryRatio,
    c.ratedBurden,
    c.accuracyClass,
    c.alfIsf,
    c.minimumKPV,
    c.lexAt6001A,
    c.rctAt75C,
  ]);
  if (hasRow(coreRows.map((row) => row.slice(1)))) {
    sections.push({
      title: "Core Details",
      node: (
        <MiniTable
          headers={["Core", "Ratio (P)", "Ratio (S)", "Burden", "Accuracy", "ALF/ISF", "Min. KPV", "Lex", "Rct"]}
          rows={coreRows}
        />
      ),
    });
  }

  const ratings = data.ratings.map((r) => [r.particular, r.r, r.y, r.b]);
  if (hasRow(ratings)) {
    sections.push({ title: "Capacitance & Tan Delta", node: <MiniTable headers={["Particular", "R", "Y", "B"]} rows={ratings} /> });
  }

  const ir = data.ir.map((r) => [r.testType, r.meggerUsed, r.r, r.y, r.b]);
  if (hasRow(ir)) sections.push({ title: "Insulation Resistance", node: <MiniTable headers={["Test", "Megger", "R", "Y", "B"]} rows={ir} /> });

  const winding = data.winding.map((r) => [r.connection, r.r, r.y, r.b]);
  if (hasRow(winding)) sections.push({ title: "Secondary Winding Resistance", node: <MiniTable headers={["Connection", "R", "Y", "B"]} rows={winding} /> });

  const polarity = data.polarity.map((r) => [r.phase, r.core1, r.core2, r.core3, r.core4]);
  if (hasRow(polarity)) {
    sections.push({
      title: "Polarity Test",
      node: <MiniTable headers={["Phase", "Core - 1", "Core - 2", "Core - 3", "Core - 4"]} rows={polarity} />,
    });
  }

  const coreId = data.coreIdentification.map((r) => [r.stage, r.phase, r.core1, r.core2, r.core3, r.core4]);
  if (hasRow(coreId)) {
    sections.push({
      title: "Core Identification",
      node: <MiniTable headers={["Stage", "Phase", "Core - 1", "Core - 2", "Core - 3", "Core - 4"]} rows={coreId} />,
    });
  }

  const ratio = data.ratio.map((r) => [
    r.phase,
    r.injectedCurrent,
    r.core1_600,
    r.core1_300,
    r.core2_600,
    r.core2_300,
    r.core3_600,
    r.core3_300,
    r.core4_600,
    r.core4_300,
  ]);
  if (hasRow(ratio)) {
    sections.push({
      title: "Ratio Test",
      node: (
        <MiniTable
          headers={["Phase", "Inj. (A)", "C1 600/1", "C1 300/1", "C2 600/1", "C2 300/1", "C3 600/1", "C3 300/1", "C4 600/1", "C4 300/1"]}
          rows={ratio}
        />
      ),
    });
  }

  const knee = data.kneePoint.map((r) => [r.core, r.step, r.appliedVoltage, r.r, r.y, r.b]);
  if (hasRow(knee)) {
    sections.push({
      title: "Knee Point Test",
      node: <MiniTable headers={["Core", "Step", "Applied (V)", "R", "Y", "B"]} rows={knee} />,
    });
  }

  const connection = Object.fromEntries(
    (
      [
        ["P1 Side", data.connection.p1Side],
        ["P2 Side", data.connection.p2Side],
        ["Primary Injected", data.connection.primaryInjected],
        ["Ratio", data.connection.ratio],
        ["D1-1 / D7-1", data.connection.d11D71],
        ["D3-1 / D7-1", data.connection.d31D71],
        ["D5-1 / D7-1", data.connection.d51D71],
        ["C1-1 / C7-1", data.connection.c11C71],
        ["C3-1 / C7-1", data.connection.c31C71],
        ["C5-1 / C7-1", data.connection.c51C71],
        ["A1-1 / A7-1", data.connection.a11A71],
        ["A3-1 / A7-1", data.connection.a31A71],
        ["A5-1 / A7-1", data.connection.a51A71],
      ] as [string, string][]
    ).filter(([, value]) => value)
  );
  if (Object.keys(connection).length) sections.push({ title: "Connection", node: <KeyValueGrid data={connection} /> });

  const series = data.series.map((r) => [r.description, r.backupPrimary, r.backupSecondary, r.diffPrimary, r.diffSecondary]);
  if (hasRow(series)) {
    sections.push({
      title: "Series Test",
      node: <MiniTable headers={["Phase", "Backup Primary", "Backup Sec.", "Diff Primary", "Diff Sec."]} rows={series} />,
    });
  }

  const metering = data.meteringProtection.map((r) => [r.description, r.meteringCore, r.protectionCore, r.diffCore]);
  if (hasRow(metering)) {
    sections.push({
      title: "Metering & Protection Cores",
      node: <MiniTable headers={["Phase", "Metering Core", "Protection Core", "Diff. Core"]} rows={metering} />,
    });
  }

  const meters = data.meterReadings.map((r) => [r.description, r.mfm1, r.mfm2, r.aMeter]);
  if (hasRow(meters)) {
    sections.push({ title: "Meter Readings", node: <MiniTable headers={["Phase", "MFM-1", "MFM-2", "A-Meter"]} rows={meters} /> });
  }

  sections.push({
    title: "Signatures",
    node: <EquipmentSignatures testedBy={data.signatures.testedBy} witnessBy={data.signatures.witnessBy} remarks={data.remarks} testedByStamp={testedByStamp} />,
  });

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

function PtSections({ data, testedByStamp }: { data: PtData; testedByStamp?: string | null }) {
  const sections: { title: string; node: React.ReactNode }[] = [];
  const header = headerEntries(data.header);
  if (Object.keys(header).length) sections.push({ title: "Test Details", node: <KeyValueGrid data={header} /> });

  const namePlate = namePlateEntries(PT_NAMEPLATE_FIELDS, data.namePlate as any);
  if (namePlate.length) sections.push({ title: "Name Plate", node: <KeyValueGrid data={Object.fromEntries(namePlate)} /> });

  if (data.cores?.length) {
    sections.push({
      title: "Core Details",
      node: (
        <MiniTable
          headers={["Core Ref", "Ratio (P)", "Ratio (S)", "Burden", "Class", "Terminal"]}
          rows={data.cores.map((c) => [c.coreReference, c.primaryRatio, c.secondaryRatio, c.ratedBurden, c.accuracyClass, c.terminal])}
        />
      ),
    });
  }

  const tan = data.tanDelta.map((r) => [r.particular, r.r, r.y, r.b]);
  if (hasRow(tan.map((row) => row.slice(1)))) {
    sections.push({ title: "Capacitance & Tan Delta", node: <MiniTable headers={["Particular", "R", "Y", "B"]} rows={tan} /> });
  }

  const ir = data.ir.map((r) => [r.status, r.meggerUsed, r.r, r.y, r.b]);
  if (hasRow(ir.map((row) => row.slice(2)))) {
    sections.push({ title: "Insulation Resistance", node: <MiniTable headers={["Test", "Megger", "R", "Y", "B"]} rows={ir} /> });
  }

  const pol = data.polarity.map((r) => [r.phase, r.core1, r.core2].filter((_, i, arr) => i === 0 || arr[i] || arr.length === 2));
  const hasPol = data.polarity.some((r) => r.core1 || r.core2);
  if (hasPol) {
    sections.push({
      title: "Polarity Test",
      node: <MiniTable headers={data.polarity.some((p) => p.core2) ? ["Phase", "Core - 1", "Core - 2"] : ["Phase", "Core - 1"]} rows={data.polarity.map((r) => (r.core2 ? [r.phase, r.core1, r.core2] : [r.phase, r.core1]))} />,
    });
  }

  const app = Object.entries(data.ratioApplied).filter(([, v]) => v);
  if (app.length) sections.push({ title: "Applied Voltage", node: <KeyValueGrid data={Object.fromEntries(app)} /> });

  if (data.ratioMeasured?.length) {
    const hasMeas = data.ratioMeasured.some((m) => m.r1n || m.y1n || m.b1n);
    if (hasMeas) {
      sections.push({
        title: "Secondary Measured Voltage",
        node: (
          <MiniTable
            headers={["Core", "R1a-R1n", "R1a-Y1a", "Y1a-Y1n", "Y1a-B1a", "B1a-B1n", "B1a-R1a"]}
            rows={data.ratioMeasured.map((m) => [m.coreName, m.r1n, m.r1y1, m.y1n, m.y1b1, m.b1n, m.b1r1])}
          />
        ),
      });
    }
  }

  sections.push({
    title: "Signatures",
    node: <EquipmentSignatures testedBy={data.signatures.testedBy} witnessBy={data.signatures.witnessBy} remarks={data.remarks} testedByStamp={testedByStamp} />,
  });

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

function PowerTrSections({ data, testedByStamp }: { data: PowerTrData; testedByStamp?: string | null }) {
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
      node: (
        <div className="space-y-3">
          {stampForName(data.signatures.testedBy, testedByStamp) ? (
            <img
              src={withBasePath(stampForName(data.signatures.testedBy, testedByStamp)!)}
              alt="Stamp"
              className="h-16 w-auto object-contain"
            />
          ) : null}
          <KeyValueGrid data={{ "Tested By": data.signatures.testedBy, "Witness By": data.signatures.witnessBy }} />
        </div>
      ),
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