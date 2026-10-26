import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportPayload, CoreRow, ChecklistRow } from "@/lib/report-types";
import { TEMPLATE_1_CHECKLIST, TEMPLATE_2_SECTIONS } from "@/lib/report-types";
import { POWER_TR_TEMPLATE_CODE } from "@/lib/power-tr-types";
import { PowerTrDocument } from "@/lib/power-tr-pdf";

const R = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#149f93",
    paddingBottom: 8,
    marginBottom: 8,
  },
  company: { fontSize: 13, fontWeight: "bold", color: "#005b91" },
  headRight: { alignItems: "flex-end" },
  reportTitle: { fontSize: 10, fontWeight: "bold", color: "#005b91" },
  reportNo: { fontSize: 9, color: "#334155", marginTop: 2 },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  metaCell: { width: "33%", paddingRight: 8, marginBottom: 4 },
  metaLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  metaValue: { fontSize: 9, color: "#111827", fontWeight: "bold" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#005b91",
    backgroundColor: "#e3f5f2",
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  table: { width: "100%" },
  th: {
    backgroundColor: "#f1f5f9",
    fontSize: 7.5,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  td: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    textAlign: "left",
  },
  kv: { marginLeft: 4, flexGrow: 1 },
  footer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBlock: { flexGrow: 1 },
  sigLine: {
    marginTop: 26,
    borderTopWidth: 0.5,
    borderTopColor: "#94a3b8",
    paddingTop: 2,
    fontSize: 8,
  },
  statusTag: {
    fontSize: 8,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 2,
    alignSelf: "flex-start" as const,
    marginBottom: 4,
  },
  remarkText: { fontSize: 8.5, lineHeight: 1.5 },
});

function stripUnsafe(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/[µ]/g, "u")
    .replace(/[Ω]/g, "Ohm")
    .replace(/[π]/g, "pi")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[→]/g, "->")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Column = { header: string; key: string; width?: string; right?: boolean };

function Sheet({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: Column[];
  rows: Record<string, string | undefined>[];
}) {
  if (rows.length === 0) return null;
  return (
    <View style={R.section} wrap>
      <Text style={R.sectionTitle}>{title}</Text>
      <View>
        <View style={[R.table, { flexDirection: "row" }]}>
          {columns.map((c) => (
            <View key={c.key} style={[{ flexBasis: c.width ?? `${100 / columns.length}%` }]}>
              <Text style={R.th}>{c.header}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={[R.table, { flexDirection: "row" }]}>
            {columns.map((c) => (
              <View key={c.key} style={[{ flexBasis: c.width ?? `${100 / columns.length}%` }]}>
                <Text style={c.right ? { ...R.td, textAlign: "right" as const } : R.td}>
                  {stripUnsafe(row[c.key]) || "—"}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function KeyValueSheet({
  title,
  values,
  twoColumns = false,
}: {
  title: string;
  values: Record<string, string | undefined>;
  twoColumns?: boolean;
}) {
  const entries = Object.entries(values).filter(([k]) => k && values[k] !== undefined && values[k] !== "");
  if (entries.length === 0) return null;
  const chunks = twoColumns
    ? [entries.slice(0, Math.ceil(entries.length / 2)), entries.slice(Math.ceil(entries.length / 2))]
    : [entries];
  return (
    <View style={R.section} wrap>
      <Text style={R.sectionTitle}>{title}</Text>
      <View style={{ flexDirection: "row" }}>
        {chunks.map((chunk, ci) => (
          <View key={ci} style={R.kv}>
            {chunk.map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", paddingVertical: 1.5 }}>
                <Text style={[R.td, { flexBasis: "45%", fontWeight: "bold", color: "#334155" }]}>{stripUnsafe(k)}</Text>
                <Text style={[R.td, { flexBasis: "55%" }]}>{stripUnsafe(v)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReportDocument({
  reportNumber,
  payload,
  meta,
}: {
  reportNumber: string;
  payload: ReportPayload;
  meta: {
    companyName: string;
    siteName?: string | null;
    switchYardName?: string | null;
    testingDate?: string | null;
    testedByName?: string | null;
    testedByStamp?: string | null;
    testedByDesignation?: string | null;
    approvedByName?: string | null;
    approvedByDesignation?: string | null;
    epcBy?: string | null;
    overallResult?: string | null;
    finalRemarks?: string | null;
  };
}) {
  const templateName =
    payload.templateCode === "66KV_LINE_CT"
      ? "66 KV LINE CURRENT TRANSFORMER TEST REPORT"
      : "66 KV CURRENT TRANSFORMER TEST REPORT";

  if (payload.templateCode === POWER_TR_TEMPLATE_CODE && payload.powerTr) {
    return (
      <PowerTrDocument
        reportNumber={reportNumber}
        companyName={meta.companyName}
        payload={payload.powerTr}
        meta={{
          siteName: meta.siteName,
          testingDate: meta.testingDate,
          testedByName: meta.testedByName,
          testedByStamp: meta.testedByStamp,
        }}
      />
    );
  }

  const status__ = meta.overallResult ? stripUnsafe(meta.overallResult) : "";

  const coreCols: Column[] = [
    { header: "Core", key: "coreName", width: "12%" },
    { header: "Ref", key: "coreReference", width: "10%" },
    { header: "Pri Ratio", key: "primaryRatio", width: "13%" },
    { header: "Sec Ratio", key: "secondaryRatio", width: "13%" },
    { header: "Burden", key: "ratedBurden", width: "10%" },
    { header: "Class", key: "accuracyClass", width: "10%" },
    { header: "ALF/ISF", key: "alfIsf", width: "10%" },
    { header: "Min KPV", key: "minimumKPV", width: "12%" },
    { header: "LEX", key: "lexAt6001A", width: "10%" },
  ];

  const threePhaseCols = (extra: Column[]): Column[] => [
    ...extra,
    { header: "R-Phase", key: "rPhase" },
    { header: "Y-Phase", key: "yPhase" },
    { header: "B-Phase", key: "bPhase" },
  ];

  const connection = payload.connection ?? {};
  const connectionEntries = [
    ["P1 Side", connection.p1Side],
    ["P2 Side", connection.p2Side],
    ["Primary Injection", connection.primaryInjection],
    ["Ratio", connection.ratio],
    ["1.1D - 1.1D1", connection.d11D71],
    ["D3.1 - D7.1", connection.d31D71],
    ["D5.1 - D7.1", connection.d51D71],
    ["C1.1 - C7.1", connection.c11C71],
    ["C3.1 - C7.1", connection.c31C71],
    ["C5.1 - C7.1", connection.c51C71],
  ].filter(([, v]) => v !== undefined && v !== "") as [string, string][];

  return (
    <Document
      title={`${reportNumber} - ${templateName}`}
      author={meta.companyName}
      subject={`Current Transformer Test Report ${reportNumber}`}
    >
      <Page size="A4" style={R.page} wrap>
        <View style={R.headerRow}>
          <View>
            <Text style={R.company}>{stripUnsafe(meta.companyName)}</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
              {stripUnsafe(meta.epcBy) ? `EPC: ${stripUnsafe(meta.epcBy)}` : "Commissioning Test Report"}
            </Text>
          </View>
          <View style={R.headRight}>
            <Text style={R.reportTitle}>{templateName}</Text>
            <Text style={R.reportNo}>Report No: {stripUnsafe(reportNumber)}</Text>
          </View>
        </View>

        {status__ && (
          <View style={R.statusTag}>
            <Text>OVERALL RESULT: {status__}</Text>
          </View>
        )}

        <View style={R.metaGrid}>
          {[
            ["Company", meta.companyName],
            ["Site", meta.siteName],
            ["Switchyard", meta.switchYardName],
            ["Test Date", meta.testingDate],
            ["Tested By", meta.testedByName ? `${meta.testedByName}${meta.testedByDesignation ? ` (${meta.testedByDesignation})` : ""}` : ""],
            ["Approved By", meta.approvedByName ? `${meta.approvedByName}${meta.approvedByDesignation ? ` (${meta.approvedByDesignation})` : ""}` : ""],
          ].map(([label, value]) => (
            <View key={label} style={R.metaCell}>
              <Text style={R.metaLabel}>{label}</Text>
              <Text style={R.metaValue}>{stripUnsafe(value) || "—"}</Text>
            </View>
          ))}
        </View>

        <KeyValueSheet title="CT Specifications / Nameplate" values={payload.specifications ?? {}} />

        <Sheet title="Core Details" columns={coreCols} rows={(payload.cores ?? []) as Record<string, string>[]} />

        <Sheet
          title="Capacitance & Tan Delta"
          columns={[
            { header: "Sr", key: "srNo" },
            { header: "Particular", key: "particular" },
            { header: "Capacitance", key: "capacitance" },
            { header: "Tan Delta", key: "tanDelta" },
            { header: "Remarks", key: "remarks" },
          ]}
          rows={payload.capacitance ?? []}
        />

        <Sheet
          title="Insulation Resistance Test"
          columns={threePhaseCols([
            { header: "Test", key: "testType" },
            { header: "Megger", key: "meggerUsed" },
            { header: "Status", key: "status" },
            { header: "Remarks", key: "remarks" },
          ])}
          rows={payload.insulation ?? []}
        />

        <Sheet
          title="Secondary Winding Resistance"
          columns={threePhaseCols([
            { header: "Connection", key: "connection" },
            { header: "Value", key: "value" },
          ])}
          rows={payload.winding ?? []}
        />

        <Sheet
          title="Polarity Test"
          columns={[
            { header: "Phase", key: "phase" },
            { header: "Core 1", key: "core1" },
            { header: "Core 2", key: "core2" },
            { header: "Core 3", key: "core3" },
            { header: "Core 4", key: "core4" },
            { header: "Remarks", key: "remarks" },
          ]}
          rows={payload.polarity ?? []}
        />

        <Sheet
          title="Core Identification Test"
          columns={[
            { header: "Stage", key: "stage" },
            { header: "Phase", key: "phase" },
            { header: "Inj. Current", key: "injectedCurrent" },
            { header: "Ratio", key: "ratio" },
            { header: "Core 1", key: "core1" },
            { header: "Core 2", key: "core2" },
            { header: "Core 3", key: "core3" },
            { header: "Core 4", key: "core4" },
          ]}
          rows={payload.coreIdentification ?? []}
        />

        <Sheet
          title="Ratio Test"
          columns={[
            { header: "Phase", key: "phase" },
            { header: "Inj. Current", key: "injectedCurrent" },
            { header: "Meas. Sec", key: "measuredSecondary" },
            { header: "Core 1", key: "core1" },
            { header: "Core 2", key: "core2" },
            { header: "Core 3", key: "core3" },
            { header: "Core 4", key: "core4" },
            { header: "Ratio", key: "ratio", width: "10%" },
            { header: "Remarks", key: "remarks", width: "12%" },
          ]}
          rows={payload.ratio ?? []}
        />

        <Sheet
          title="Knee Point / KV Point Test"
          columns={[
            { header: "KV Step", key: "kvStep" },
            { header: "KVP", key: "kneePointVoltage" },
            { header: "LEX", key: "lex" },
            { header: "Test Current", key: "testCurrent" },
            { header: "Core", key: "core" },
            { header: "Applied V", key: "appliedVoltage" },
            ...threePhaseCols([]),
            { header: "Remarks", key: "remarks" },
          ]}
          rows={payload.kneePoint ?? []}
        />

        {connectionEntries.length > 0 && (
          <KeyValueSheet
            title="CT Connection"
            values={Object.fromEntries(connectionEntries)}
            twoColumns
          />
        )}

        <Sheet
          title="CT Series Test"
          columns={[
            { header: "Description", key: "description" },
            { header: "Backup Relay", key: "backupRelay" },
            { header: "A-Meter", key: "aMeter" },
            { header: "MFM", key: "mfm" },
            { header: "PQM Meter", key: "pqmMeter" },
            { header: "Primary", key: "primary" },
            { header: "Secondary", key: "secondary" },
            ...threePhaseCols([]),
            { header: "EF", key: "ef" },
            { header: "Remarks", key: "remarks" },
          ]}
          rows={payload.series ?? []}
        />

        <Sheet
          title="Metering & Protection Core"
          columns={[
            { header: "Description", key: "description" },
            { header: "Metering Core", key: "meteringCore" },
            { header: "Protection Core", key: "protectionCore" },
            ...threePhaseCols([]),
            { header: "EF", key: "ef" },
            { header: "Remarks", key: "remarks" },
          ]}
          rows={payload.meteringProtection ?? []}
        />

        {/* Template 1: flat checklist */}
        {payload.templateCode !== "66KV_LINE_CT" && (payload.checklist ?? []).length > 0 && (
          <Sheet
            title="Detailed Test Checklist"
            columns={[
              { header: "Test", key: "testName", width: "35%" },
              { header: "Readings", key: "readings" },
              { header: "Remarks", key: "remarks" },
              { header: "Status", key: "status", width: "12%" },
            ]}
            rows={payload.checklist ?? []}
          />
        )}

        {/* Template 2: expand to full checklist rows if never populated in checklist field */}
        {payload.templateCode === "66KV_LINE_CT" && (payload.checklist ?? []).length === 0 && (
          <Sheet
            title="Test Checklist"
            columns={[
              { header: "Test", key: "testName", width: "60%" },
              { header: "Readings", key: "readings" },
              { header: "Remarks", key: "remarks" },
            ]}
            rows={(TEMPLATE_1_CHECKLIST as string[]).map((t) => ({ testName: t })) as Record<string, string>[]}
          />
        )}

        {meta.finalRemarks && (
          <View style={R.section}>
            <Text style={R.sectionTitle}>Overall Remarks</Text>
            <Text style={R.remarkText}>{stripUnsafe(meta.finalRemarks)}</Text>
          </View>
        )}

        <View style={R.footer}>
          {[
            ["Tested By", meta.testedByName, meta.testedByDesignation],
            ["Approved By", meta.approvedByName, meta.approvedByDesignation],
          ].map(([label, name, designation]) => (
            <View key={label} style={R.sigBlock}>
              <Text style={{ fontSize: 7, color: "#64748b", textTransform: "uppercase" }}>{label}</Text>
              <Text style={R.sigLine}>{stripUnsafe(name) || "________________"}</Text>
              <Text style={{ fontSize: 7, color: "#64748b", marginTop: 1 }}>
                {stripUnsafe(designation) || ""}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export type ReportDocumentProps = Parameters<typeof ReportDocument>[0];