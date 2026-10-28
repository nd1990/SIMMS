"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureFields as SharedSignatureFields } from "@/components/mobile/signature-fields";
import {
  CB_NAMEPLATE_FIELDS,
  CB_SHEETS,
  MCT_CORE_FIELDS,
  MCT_NAMEPLATE_FIELDS,
  MCT_SHEETS,
  PCT_CORE_FIELDS,
  PCT_NAMEPLATE_FIELDS,
  PCT_SHEETS,
  MPT_TEMPLATE_CODE,
  PPT_TEMPLATE_CODE,
  PT_NAMEPLATE_FIELDS,
  type CbData,
  type MctData,
  type PctData,
  type PtData,
} from "@/lib/equipment-types";

// Mobile forms for the 66 KV CB / MCT / PCT reports. Each form owns its sheet
// tabs so it can be dropped into the shared ReportForm shell.

type CbSheetId = "details" | "ir" | "operations" | "indications" | "relay" | "crm" | "timing" | "sign";
type MctSheetId = "details" | "core" | "ratings" | "ir" | "winding" | "polarity" | "ratio" | "series" | "sign";
type PctSheetId =
  | "details"
  | "cores"
  | "ratings"
  | "ir"
  | "winding"
  | "polarity"
  | "coreid"
  | "ratio"
  | "knee"
  | "series"
  | "sign";

const CB_TABS: { id: CbSheetId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "ir", label: "IR" },
  { id: "operations", label: "Operations" },
  { id: "indications", label: "Indications" },
  { id: "relay", label: "Relay" },
  { id: "crm", label: "CRM" },
  { id: "timing", label: "Timing" },
  { id: "sign", label: "Signatures" },
];

const MCT_TABS: { id: MctSheetId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "core", label: "Core" },
  { id: "ratings", label: "Cap/TanD" },
  { id: "ir", label: "IR" },
  { id: "winding", label: "Winding" },
  { id: "polarity", label: "Polarity" },
  { id: "ratio", label: "Ratio" },
  { id: "series", label: "Series" },
  { id: "sign", label: "Signatures" },
];

const PCT_TABS: { id: PctSheetId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "cores", label: "Cores" },
  { id: "ratings", label: "Cap/TanD" },
  { id: "ir", label: "IR" },
  { id: "winding", label: "Winding" },
  { id: "polarity", label: "Polarity" },
  { id: "coreid", label: "Core ID" },
  { id: "ratio", label: "Ratio" },
  { id: "knee", label: "Knee Point" },
  { id: "series", label: "Series" },
  { id: "sign", label: "Signatures" },
];

// ------------------------------------------------------------
// Shared UI
// ------------------------------------------------------------

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

function FixedLabel({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{children}</span>;
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
              <th
                key={i}
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
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

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max gap-1 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeaderFields({
  header,
  onChange,
}: {
  header: CbData["header"];
  onChange: (key: keyof CbData["header"], value: string) => void;
}) {
  const fields: { key: keyof CbData["header"]; label: string; placeholder?: string }[] = [
    { key: "partyName", label: "Party Name" },
    { key: "switchYard", label: "Switch Yard" },
    { key: "projectName", label: "Project Name" },
    { key: "epcBy", label: "EPC / Contractor" },
    { key: "siteName", label: "Name of Site" },
    { key: "dateOfTesting", label: "Date of Testing" },
    { key: "equipmentName", label: "Equipment Name" },
    { key: "srNo", label: "Sr. No." },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          <Input
            value={header[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </Field>
      ))}
    </div>
  );
}

function SignatureFields({
  values,
  onChange,
}: {
  values: { testedBy: string; witnessBy: string };
  onChange: (key: "testedBy" | "witnessBy", value: string) => void;
}) {
  // Shared with the Power Transformer form: employee picker + stamp preview.
  return <SharedSignatureFields values={values} onChange={onChange} title={null} hint={null} />;
}

function RemarksField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Remarks">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional notes" />
    </Field>
  );
}

// ------------------------------------------------------------
// 66 KV CB
// ------------------------------------------------------------

export function CbForm({ data, onChange }: { data: CbData; onChange: (data: CbData) => void }) {
  const [tab, setTab] = useState<CbSheetId>("details");

  function set<K extends keyof CbData>(key: K, value: CbData[K]) {
    onChange({ ...data, [key]: value } as CbData);
  }

  function setHeader<K extends keyof CbData["header"]>(key: K, value: string) {
    onChange({ ...data, header: { ...data.header, [key]: value } });
  }

  function setNamePlate<K extends keyof CbData["namePlate"]>(key: K, value: string) {
    onChange({ ...data, namePlate: { ...data.namePlate, [key]: value } });
  }

  function setRow<K extends "breakerSrNos" | "irOff" | "irOn" | "operations" | "indications" | "relayStatus" | "crm" | "timing" | "coil">(
    key: K,
    index: number,
    field: string,
    value: string
  ) {
    const list = [...(data[key] as Record<string, string>[])];
    list[index] = { ...list[index], [field]: value };
    onChange({ ...data, [key]: list } as CbData);
  }

  return (
    <div className="space-y-3">
      <TabBar tabs={CB_TABS} active={tab} onChange={setTab} />

      {tab === "details" && (
        <Section title="1. Test details & name plate" subtitle="Header information and breaker name plate">
          <HeaderFields header={data.header} onChange={setHeader} />
          <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
            {CB_NAMEPLATE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input value={data.namePlate[field.key]} onChange={(e) => setNamePlate(field.key, e.target.value)} />
              </Field>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Breaker Serial Numbers</p>
            <GridTable headers={["Description", "Sr. No."]} minWidth={360}>
              {data.breakerSrNos.map((row, i) => (
                <tr key={i}>
                  <td className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput value={row.description} onChange={(v) => setRow("breakerSrNos", i, "description", v)} className="text-left" />
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput value={row.srNo} onChange={(v) => setRow("breakerSrNos", i, "srNo", v)} />
                  </td>
                </tr>
              ))}
            </GridTable>
          </div>
        </Section>
      )}

      {tab === "ir" && (
        <Section title="2. Insulation Resistance (IR)" subtitle="Values in MOhm">
          {([{ key: "irOff", label: "Breaker OFF" }, { key: "irOn", label: "Breaker ON" }] as const).map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">{label}</p>
              <GridTable headers={["Phase", "A-B", "B-C", "A-C"]} minWidth={420}>
                {data[key].map((row, i) => (
                  <tr key={`${key}-${i}`}>
                    <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                    <td className="border-b border-slate-100 px-1.5 py-1.5">
                      <CellInput inputMode="decimal" value={row.aB} onChange={(v) => setRow(key, i, "aB", v)} />
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1.5">
                      <CellInput inputMode="decimal" value={row.bC} onChange={(v) => setRow(key, i, "bC", v)} />
                    </td>
                    <td className="border-b border-slate-100 px-1.5 py-1.5">
                      <CellInput inputMode="decimal" value={row.aC} onChange={(v) => setRow(key, i, "aC", v)} />
                    </td>
                  </tr>
                ))}
              </GridTable>
            </div>
          ))}
        </Section>
      )}

      {tab === "operations" && (
        <Section title="3. Operation checks" subtitle="Mechanical and electrical operation verification">
          <GridTable headers={["Operation", "Mechanically", "Electrical Local", "Electrical Remote"]} minWidth={620}>
            {data.operations.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.operation}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.mechanically} onChange={(v) => setRow("operations", i, "mechanically", v)} />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.electricalLocal} onChange={(v) => setRow("operations", i, "electricalLocal", v)} />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.electricalRemote} onChange={(v) => setRow("operations", i, "electricalRemote", v)} />
                </td>
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "indications" && (
        <Section title="4. Indications" subtitle="Status shown in the control & relay panel">
          <GridTable headers={["Description", "Status in CRP"]} minWidth={420}>
            {data.indications.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.description}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.statusInCrp} onChange={(v) => setRow("indications", i, "statusInCrp", v)} />
                </td>
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "relay" && (
        <Section title="5. Relay status" subtitle="Relay flags and LEDs">
          <GridTable headers={["Relay", "Description", "Status in Relay", "LED in Relay"]} minWidth={620}>
            {data.relayStatus.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.relay} onChange={(v) => setRow("relayStatus", i, "relay", v)} className="text-left" />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.description} onChange={(v) => setRow("relayStatus", i, "description", v)} className="text-left" />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.statusInRelay} onChange={(v) => setRow("relayStatus", i, "statusInRelay", v)} />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.ledInRelay} onChange={(v) => setRow("relayStatus", i, "ledInRelay", v)} />
                </td>
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "crm" && (
        <Section title="6. Contact resistance measurement (CRM)" subtitle="Values in uOhm — average is calculated in the PDF">
          <GridTable headers={["Phase", "Value 1", "Value 2", "Value 3"]} minWidth={460}>
            {data.crm.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                {(["value1", "value2", "value3"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("crm", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "timing" && (
        <Section title="7. Timing, coil resistance & spring charge" subtitle="Timing in ms; coil resistance in Ohm">
          <GridTable headers={["Test", "R", "Y", "B"]} minWidth={420}>
            {data.timing.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.test}</FixedLabel></td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("timing", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>

          <GridTable headers={["Location", "Resistance (Ohm)", "Current (A)"]} minWidth={420}>
            {data.coil.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.location}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput inputMode="decimal" value={row.resistance} onChange={(v) => setRow("coil", i, "resistance", v)} />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput inputMode="decimal" value={row.current} onChange={(v) => setRow("coil", i, "current", v)} />
                </td>
              </tr>
            ))}
          </GridTable>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Spring Charge Time (Sec)", "time"],
                ["Spring Charge Current (A)", "amp"],
                ["AC Voltage", "acVoltage"],
                ["DC Voltage", "dcVoltage"],
              ] as const
            ).map(([label, key]) => (
              <Field key={key} label={label}>
                <Input
                  inputMode="decimal"
                  value={data.springCharge[key]}
                  onChange={(e) => onChange({ ...data, springCharge: { ...data.springCharge, [key]: e.target.value } })}
                />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {tab === "sign" && (
        <Section title="8. Signatures & remarks">
          <SignatureFields
            values={data.signatures}
            onChange={(key, value) => onChange({ ...data, signatures: { ...data.signatures, [key]: value } })}
          />
          <RemarksField value={data.remarks} onChange={(v) => set("remarks", v)} />
        </Section>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// 66 KV MCT
// ------------------------------------------------------------

export function MctForm({ data, onChange }: { data: MctData; onChange: (data: MctData) => void }) {
  const [tab, setTab] = useState<MctSheetId>("details");

  function setHeader<K extends keyof MctData["header"]>(key: K, value: string) {
    onChange({ ...data, header: { ...data.header, [key]: value } });
  }

  function setNamePlate<K extends keyof MctData["namePlate"]>(key: K, value: string) {
    onChange({ ...data, namePlate: { ...data.namePlate, [key]: value } });
  }

  function setCore<K extends keyof MctData["core"]>(key: K, value: string) {
    onChange({ ...data, core: { ...data.core, [key]: value } });
  }

  function setRow<K extends "ratings" | "ir" | "winding" | "polarity" | "ratio">(key: K, index: number, field: string, value: string) {
    const list = [...(data[key] as Record<string, string>[])];
    list[index] = { ...list[index], [field]: value };
    onChange({ ...data, [key]: list } as MctData);
  }

  return (
    <div className="space-y-3">
      <TabBar tabs={MCT_TABS} active={tab} onChange={setTab} />

      {tab === "details" && (
        <Section title="1. Test details & name plate" subtitle="Header information and CT name plate">
          <HeaderFields header={data.header} onChange={setHeader} />
          <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
            {MCT_NAMEPLATE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input value={data.namePlate[field.key]} onChange={(e) => setNamePlate(field.key, e.target.value)} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {tab === "core" && (
        <Section title="2. Core details" subtitle="Metering core ratings">
          <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
            {MCT_CORE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input value={data.core[field.key]} onChange={(e) => setCore(field.key, e.target.value)} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {tab === "ratings" && (
        <Section title="3. Capacitance & tan delta" subtitle="Per-phase capacitance and tan delta">
          <GridTable headers={["Particular", "R", "Y", "B"]} minWidth={440}>
            {data.ratings.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.particular}</FixedLabel></td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("ratings", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "ir" && (
        <Section title="4. Insulation resistance" subtitle="Values in MOhm">
          <GridTable headers={["Test", "Megger", "R", "Y", "B"]} minWidth={560}>
            {data.ir.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.testType}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.meggerUsed} onChange={(v) => setRow("ir", i, "meggerUsed", v)} />
                </td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("ir", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "winding" && (
        <Section title="5. Secondary winding resistance" subtitle="Values in Ohm">
          <GridTable headers={["Connection", "R", "Y", "B"]} minWidth={440}>
            {data.winding.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.connection} onChange={(v) => setRow("winding", i, "connection", v)} />
                </td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("winding", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "polarity" && (
        <Section title="6. Polarity test" subtitle="ADD / SUBT result per phase">
          <GridTable headers={["Phase", "Core - 1"]} minWidth={320}>
            {data.polarity.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput placeholder="ADD/SUBT" value={row.core1} onChange={(v) => setRow("polarity", i, "core1", v)} />
                </td>
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "ratio" && (
        <Section title="7. Ratio test" subtitle="Measured secondary current per injected primary current">
          <GridTable headers={["Phase", "Injected (A)", "Measured Sec. (mA)"]} minWidth={420}>
            {data.ratio.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput inputMode="decimal" value={row.injectedCurrent} onChange={(v) => setRow("ratio", i, "injectedCurrent", v)} />
                </td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput inputMode="decimal" value={row.measured} onChange={(v) => setRow("ratio", i, "measured", v)} />
                </td>
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "series" && (
        <Section title="8. Connection & series test">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="P1 Side">
              <Input
                value={data.connection.p1Side}
                onChange={(e) => onChange({ ...data, connection: { ...data.connection, p1Side: e.target.value } })}
              />
            </Field>
            <Field label="P2 Side">
              <Input
                value={data.connection.p2Side}
                onChange={(e) => onChange({ ...data, connection: { ...data.connection, p2Side: e.target.value } })}
              />
            </Field>
          </div>
          <p className="text-xs font-semibold text-slate-600">Series Test</p>
          <GridTable headers={["Injected Primary (A)", "Ratio", "R", "Y", "B"]} minWidth={520}>
            <tr>
              {(["injectedPrimary", "ratio", "r", "y", "b"] as const).map((field) => (
                <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput
                    value={data.series[field]}
                    onChange={(v) => onChange({ ...data, series: { ...data.series, [field]: v } })}
                  />
                </td>
              ))}
            </tr>
          </GridTable>
        </Section>
      )}

      {tab === "sign" && (
        <Section title="9. Signatures & remarks">
          <SignatureFields
            values={data.signatures}
            onChange={(key, value) => onChange({ ...data, signatures: { ...data.signatures, [key]: value } })}
          />
          <RemarksField value={data.remarks} onChange={(v) => onChange({ ...data, remarks: v })} />
        </Section>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// 66 KV PCT
// ------------------------------------------------------------

export function PctForm({ data, onChange }: { data: PctData; onChange: (data: PctData) => void }) {
  const [tab, setTab] = useState<PctSheetId>("details");

  function setHeader<K extends keyof PctData["header"]>(key: K, value: string) {
    onChange({ ...data, header: { ...data.header, [key]: value } });
  }

  function setNamePlate<K extends keyof PctData["namePlate"]>(key: K, value: string) {
    onChange({ ...data, namePlate: { ...data.namePlate, [key]: value } });
  }

  function setRow<K extends "cores" | "ratings" | "ir" | "winding" | "polarity" | "coreIdentification" | "ratio" | "kneePoint" | "series" | "meteringProtection" | "meterReadings">(
    key: K,
    index: number,
    field: string,
    value: string
  ) {
    const list = [...(data[key] as Record<string, string>[])];
    list[index] = { ...list[index], [field]: value };
    onChange({ ...data, [key]: list } as PctData);
  }

  return (
    <div className="space-y-3">
      <TabBar tabs={PCT_TABS} active={tab} onChange={setTab} />

      {tab === "details" && (
        <Section title="1. Test details & name plate" subtitle="Header information and CT name plate">
          <HeaderFields header={data.header} onChange={setHeader} />
          <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
            {PCT_NAMEPLATE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input value={data.namePlate[field.key]} onChange={(e) => setNamePlate(field.key, e.target.value)} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {tab === "cores" && (
        <Section title="2. Core details" subtitle="Rating of Core 1 to Core 4">
          <div className="space-y-5">
            {data.cores.map((core, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Core</span>
                  <Input
                    className="h-8 max-w-[140px]"
                    value={core.coreName}
                    onChange={(e) => setRow("cores", i, "coreName", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 [&>*]:min-w-0">
                  {PCT_CORE_FIELDS.map((field) => (
                    <Field key={field.key} label={field.label}>
                      <Input
                        value={core[field.key]}
                        onChange={(e) => setRow("cores", i, field.key, e.target.value)}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "ratings" && (
        <Section title="3. Capacitance & tan delta" subtitle="Per-phase capacitance and tan delta">
          <GridTable headers={["Particular", "R", "Y", "B"]} minWidth={440}>
            {data.ratings.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.particular}</FixedLabel></td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("ratings", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "ir" && (
        <Section title="4. Insulation resistance" subtitle="Values in MOhm">
          <GridTable headers={["Test", "Megger", "R", "Y", "B"]} minWidth={560}>
            {data.ir.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.testType}</FixedLabel></td>
                <td className="border-b border-slate-100 px-1.5 py-1.5">
                  <CellInput value={row.meggerUsed} onChange={(v) => setRow("ir", i, "meggerUsed", v)} />
                </td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("ir", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "winding" && (
        <Section title="5. Secondary winding resistance" subtitle="Values in Ohm">
          <GridTable headers={["Connection", "R", "Y", "B"]} minWidth={440}>
            {data.winding.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.connection}</FixedLabel></td>
                {(["r", "y", "b"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("winding", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "polarity" && (
        <Section title="6. Polarity test" subtitle="ADD / SUBT result per core">
          <GridTable headers={["Phase", "Core - 1", "Core - 2", "Core - 3", "Core - 4"]} minWidth={520}>
            {data.polarity.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                {(["core1", "core2", "core3", "core4"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput
                      placeholder="ADD/SUBT"
                      value={row[field]}
                      onChange={(v) => setRow("polarity", i, field, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "coreid" && (
        <Section title="7. Core identification test" subtitle="Before and after shorting the CT secondary terminals">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-600">Primary injected:</span>
            <CellInput
              className="w-20"
              inputMode="decimal"
              value={data.coreIdInjected}
              onChange={(v) => onChange({ ...data, coreIdInjected: v })}
            />
            <span className="text-xs font-medium text-slate-600">Measured / Ratio:</span>
            <CellInput className="w-28" value={data.coreIdRatio} onChange={(v) => onChange({ ...data, coreIdRatio: v })} />
          </div>
          {["Before shorting CT sec terminals", "After shorting CT sec terminals"].map((stage) => (
            <div key={stage} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">{stage}</p>
              <GridTable headers={["Phase", "Core - 1", "Core - 2", "Core - 3", "Core - 4"]} minWidth={520}>
                {data.coreIdentification
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.stage === stage)
                  .map(({ row, idx }) => (
                    <tr key={idx}>
                      <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                      {(["core1", "core2", "core3", "core4"] as const).map((field) => (
                        <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                          <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("coreIdentification", idx, field, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
              </GridTable>
            </div>
          ))}
        </Section>
      )}

      {tab === "ratio" && (
        <Section title="8. Ratio test" subtitle="Measured secondary current at 600/1 A and 300/1 A taps">
          {[
            { title: "Core 1 & Core 2", labels: ["C1 600/1", "C1 300/1", "C2 600/1", "C2 300/1"], fields: ["core1_600", "core1_300", "core2_600", "core2_300"] as const },
            { title: "Core 3 & Core 4", labels: ["C3 600/1", "C3 300/1", "C4 600/1", "C4 300/1"], fields: ["core3_600", "core3_300", "core4_600", "core4_300"] as const },
          ].map((table) => (
            <div key={table.title} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">{table.title}</p>
              <GridTable headers={["Phase", "Inj. (A)", ...table.labels]} minWidth={640}>
                {data.ratio.map((row, i) => {
                  const idx = i;
                  return (
                    <tr key={i}>
                      <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.phase}</FixedLabel></td>
                      <td className="border-b border-slate-100 px-1.5 py-1.5">
                        <CellInput inputMode="decimal" value={row.injectedCurrent} onChange={(v) => setRow("ratio", idx, "injectedCurrent", v)} />
                      </td>
                      {table.fields.map((field) => (
                        <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                          <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("ratio", idx, field, v)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </GridTable>
            </div>
          ))}
          <p className="text-xs text-slate-400">Rows are stored per phase and tap: Core 1/2 table edits C1/C2, Core 3/4 table edits C3/C4.</p>
        </Section>
      )}

      {tab === "knee" && (
        <Section title="9. Knee point test" subtitle="Knee point voltage and exciting current">
          {["3S1-3S3 (Core 3)", "4S1-4S3 (Core 4)"].map((core) => (
            <div key={core} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">{core}</p>
              <GridTable headers={["Step", "Applied (V)", "R", "Y", "B"]} minWidth={520}>
                {data.kneePoint
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.core === core)
                  .map(({ row, idx }) => (
                    <tr key={idx}>
                      <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.step}</FixedLabel></td>
                      <td className="border-b border-slate-100 px-1.5 py-1.5">
                        <CellInput inputMode="decimal" value={row.appliedVoltage} onChange={(v) => setRow("kneePoint", idx, "appliedVoltage", v)} />
                      </td>
                      {(["r", "y", "b"] as const).map((field) => (
                        <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                          <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("kneePoint", idx, field, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
              </GridTable>
            </div>
          ))}
        </Section>
      )}

      {tab === "series" && (
        <Section title="10. Connection, series & metering test">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["p1Side", "P1 Side"],
                ["p2Side", "P2 Side"],
                ["primaryInjected", "Primary Injected"],
                ["ratio", "Ratio"],
                ["d11D71", "D1-1 / D7-1"],
                ["d31D71", "D3-1 / D7-1"],
                ["d51D71", "D5-1 / D7-1"],
                ["c11C71", "C1-1 / C7-1"],
                ["c31C71", "C3-1 / C7-1"],
                ["c51C71", "C5-1 / C7-1"],
                ["a11A71", "A1-1 / A7-1"],
                ["a31A71", "A3-1 / A7-1"],
                ["a51A71", "A5-1 / A7-1"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={data.connection[key]}
                  onChange={(e) => onChange({ ...data, connection: { ...data.connection, [key]: e.target.value } })}
                />
              </Field>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-600">Series Test</p>
          <GridTable headers={["Phase", "Backup Primary", "Backup Sec.", "Diff Primary", "Diff Sec."]} minWidth={620}>
            {data.series.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.description}</FixedLabel></td>
                {(["backupPrimary", "backupSecondary", "diffPrimary", "diffSecondary"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("series", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>

          <p className="text-xs font-semibold text-slate-600">Metering / Protection / Differential Cores</p>
          <GridTable headers={["Phase", "Metering Core", "Protection Core", "Diff. Core"]} minWidth={520}>
            {data.meteringProtection.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.description}</FixedLabel></td>
                {(["meteringCore", "protectionCore", "diffCore"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("meteringProtection", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>

          <p className="text-xs font-semibold text-slate-600">Meter Readings</p>
          <GridTable headers={["Phase", "MFM-1", "MFM-2", "A-Meter"]} minWidth={460}>
            {data.meterReadings.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-slate-100 px-1.5 py-1.5"><FixedLabel>{row.description}</FixedLabel></td>
                {(["mfm1", "mfm2", "aMeter"] as const).map((field) => (
                  <td key={field} className="border-b border-slate-100 px-1.5 py-1.5">
                    <CellInput inputMode="decimal" value={row[field]} onChange={(v) => setRow("meterReadings", i, field, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </GridTable>
        </Section>
      )}

      {tab === "sign" && (
        <Section title="11. Signatures & remarks">
          <SignatureFields
            values={data.signatures}
            onChange={(key, value) => onChange({ ...data, signatures: { ...data.signatures, [key]: value } })}
          />
          <RemarksField value={data.remarks} onChange={(v) => onChange({ ...data, remarks: v })} />
        </Section>
      )}
    </div>
  );
}

function PtForm({
  data,
  onChange,
  isBus,
}: {
  data: PtData;
  onChange: (data: PtData) => void;
  isBus?: boolean;
}) {
  const set = <K extends keyof PtData>(key: K, value: PtData[K]) => onChange({ ...data, [key]: value });
  const setHeader = (patch: Partial<PtData["header"]>) => set("header", { ...data.header, ...patch });
  const setName = (patch: Partial<PtData["namePlate"]>) => set("namePlate", { ...data.namePlate, ...patch });
  const setSig = (patch: Partial<PtData["signatures"]>) => set("signatures", { ...data.signatures, ...patch });

  const updateCore = (idx: number, patch: Partial<PtData["cores"][number]>) => {
    const cores = [...data.cores];
    cores[idx] = { ...cores[idx], ...patch };
    set("cores", cores);
    const ratioMeasured = cores.map((c, i) =>
      data.ratioMeasured?.[i]
        ? { ...data.ratioMeasured[i], coreName: c.coreReference }
        : { coreName: c.coreReference, r1n: "", r1y1: "", y1n: "", y1b1: "", b1n: "", b1r1: "" }
    );
    set("ratioMeasured", ratioMeasured);
  };

  const updateTan = (idx: number, patch: Partial<PtData["tanDelta"][number]>) => {
    const tanDelta = [...data.tanDelta];
    tanDelta[idx] = { ...tanDelta[idx], ...patch };
    set("tanDelta", tanDelta);
  };
  const updateIr = (idx: number, patch: Partial<PtData["ir"][number]>) => {
    const ir = [...data.ir];
    ir[idx] = { ...ir[idx], ...patch };
    set("ir", ir);
  };
  const updatePol = (idx: number, patch: Partial<PtData["polarity"][number]>) => {
    const polarity = [...data.polarity];
    polarity[idx] = { ...polarity[idx], ...patch };
    set("polarity", polarity);
  };
  const updateRat = (idx: number, patch: Partial<PtData["ratioMeasured"][number]>) => {
    const ratioMeasured = [...data.ratioMeasured];
    ratioMeasured[idx] = { ...ratioMeasured[idx], ...patch };
    set("ratioMeasured", ratioMeasured);
  };
  const setRatioApplied = (patch: Partial<PtData["ratioApplied"]>) => set("ratioApplied", { ...data.ratioApplied, ...patch });

  return (
    <div className="space-y-3">
      <Section title="Test Details">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Field label="Party Name"><CellInput value={data.header.partyName} onChange={(v) => setHeader({ partyName: v })} /></Field>
          <Field label="Switch Yard"><CellInput value={data.header.switchYard} onChange={(v) => setHeader({ switchYard: v })} /></Field>
          <Field label="Project Name"><CellInput value={data.header.projectName} onChange={(v) => setHeader({ projectName: v })} /></Field>
          <Field label="EPC By"><CellInput value={data.header.epcBy} onChange={(v) => setHeader({ epcBy: v })} /></Field>
          <Field label="Site Name"><CellInput value={data.header.siteName} onChange={(v) => setHeader({ siteName: v })} /></Field>
          <Field label="Date of Testing"><CellInput value={data.header.dateOfTesting} onChange={(v) => setHeader({ dateOfTesting: v })} /></Field>
          <Field label="Equipment Name"><CellInput value={data.header.equipmentName} onChange={(v) => setHeader({ equipmentName: v })} /></Field>
          <Field label="S. No. / Sr. No."><CellInput value={data.header.srNo} onChange={(v) => setHeader({ srNo: v })} /></Field>
        </div>
      </Section>

      <Section title="Name Plate">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {PT_NAMEPLATE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}><CellInput value={(data.namePlate as any)[f.key] || ""} onChange={(v) => setName({ [f.key]: v } as any)} /></Field>
          ))}
        </div>
      </Section>

      <Section title="Core Details">
        <GridTable headers={["Core Ref.", "Ratio (P)", "Ratio (S)", "Burden (VA)", "Class", "Terminal"]} minWidth={520}>
          {data.cores.map((c, idx) => (
            <tr key={idx}>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.coreReference} onChange={(v) => updateCore(idx, { coreReference: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.primaryRatio} onChange={(v) => updateCore(idx, { primaryRatio: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.secondaryRatio} onChange={(v) => updateCore(idx, { secondaryRatio: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.ratedBurden} onChange={(v) => updateCore(idx, { ratedBurden: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.accuracyClass} onChange={(v) => updateCore(idx, { accuracyClass: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={c.terminal} onChange={(v) => updateCore(idx, { terminal: v })} /></td>
            </tr>
          ))}
        </GridTable>
      </Section>

      <Section title="Capacitance & Tan Delta">
        <GridTable headers={["Particular", "R", "Y", "B"]} minWidth={420}>
          {data.tanDelta.map((r, idx) => (
            <tr key={idx}>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.particular} onChange={(v) => updateTan(idx, { particular: v })} className="text-left" /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.r} onChange={(v) => updateTan(idx, { r: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.y} onChange={(v) => updateTan(idx, { y: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.b} onChange={(v) => updateTan(idx, { b: v })} /></td>
            </tr>
          ))}
        </GridTable>
      </Section>

      <Section title="Insulation Resistance (IR) Test">
        <GridTable headers={["Test", "Megger Used", "R", "Y", "B"]} minWidth={520}>
          {data.ir.map((r, idx) => (
            <tr key={idx}>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.status} onChange={(v) => updateIr(idx, { status: v })} className="text-left" /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.meggerUsed} onChange={(v) => updateIr(idx, { meggerUsed: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.r} onChange={(v) => updateIr(idx, { r: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.y} onChange={(v) => updateIr(idx, { y: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.b} onChange={(v) => updateIr(idx, { b: v })} /></td>
            </tr>
          ))}
        </GridTable>
      </Section>

      <Section title="Polarity Test">
        <GridTable headers={data.polarity.some((p) => p.core2 !== undefined) || isBus ? ["Phase", "Core - 1", "Core - 2"] : ["Phase", "Core - 1"]} minWidth={420}>
          {data.polarity.map((r, idx) => (
            <tr key={idx}>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.phase} onChange={(v) => updatePol(idx, { phase: v })} /></td>
              <td className="border border-slate-200 px-1 py-1"><CellInput value={r.core1} onChange={(v) => updatePol(idx, { core1: v })} /></td>
              {(data.polarity.some((p) => p.core2 !== undefined) || isBus) && (
                <td className="border border-slate-200 px-1 py-1"><CellInput value={r.core2 || ""} onChange={(v) => updatePol(idx, { core2: v })} /></td>
              )}
            </tr>
          ))}
        </GridTable>
        <Field label="Remarks (Polarity)"><CellInput value={data.remarks} onChange={(v) => set("remarks", v)} /></Field>
      </Section>

      <Section title="Ratio Test">
        <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">3-Φ, 440 V applied on HV Side & Secondary Measured</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Field label="RY"><CellInput value={data.ratioApplied.ry} onChange={(v) => setRatioApplied({ ry: v })} /></Field>
          <Field label="YB"><CellInput value={data.ratioApplied.yb} onChange={(v) => setRatioApplied({ yb: v })} /></Field>
          <Field label="BR"><CellInput value={data.ratioApplied.br} onChange={(v) => setRatioApplied({ br: v })} /></Field>
          <Field label="RN"><CellInput value={data.ratioApplied.rn} onChange={(v) => setRatioApplied({ rn: v })} /></Field>
          <Field label="YN"><CellInput value={data.ratioApplied.yn} onChange={(v) => setRatioApplied({ yn: v })} /></Field>
          <Field label="BN"><CellInput value={data.ratioApplied.bn} onChange={(v) => setRatioApplied({ bn: v })} /></Field>
        </div>
        <div className="mt-3">
          <GridTable headers={["Core", "R1a-R1n", "R1a-Y1a", "Y1a-Y1n", "Y1a-B1a", "B1a-B1n", "B1a-R1a"]} minWidth={620}>
            {data.ratioMeasured.map((m, idx) => (
              <tr key={idx}>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.coreName} onChange={(v) => updateRat(idx, { coreName: v })} className="text-left" /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.r1n} onChange={(v) => updateRat(idx, { r1n: v })} /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.r1y1} onChange={(v) => updateRat(idx, { r1y1: v })} /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.y1n} onChange={(v) => updateRat(idx, { y1n: v })} /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.y1b1} onChange={(v) => updateRat(idx, { y1b1: v })} /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.b1n} onChange={(v) => updateRat(idx, { b1n: v })} /></td>
                <td className="border border-slate-200 px-1 py-1"><CellInput value={m.b1r1} onChange={(v) => updateRat(idx, { b1r1: v })} /></td>
              </tr>
            ))}
          </GridTable>
        </div>
      </Section>

      <Section title="Signatures">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Field label="Tested By"><CellInput value={data.signatures.testedBy} onChange={(v) => setSig({ testedBy: v })} /></Field>
          <Field label="Witness By"><CellInput value={data.signatures.witnessBy} onChange={(v) => setSig({ witnessBy: v })} /></Field>
        </div>
      </Section>
    </div>
  );
}

// Sheet metadata re-exported so integration points can use a single source.
export const EQUIPMENT_SHEET_TABS = {
  CB_66KV: CB_SHEETS,
  MCT_66KV: MCT_SHEETS,
  PCT_66KV: PCT_SHEETS,
  MPT_66KV: [] as string[],
  PPT_66KV: [] as string[],
} as const;

export type { CbSheetId, MctSheetId, PctSheetId };

export { PtForm };

