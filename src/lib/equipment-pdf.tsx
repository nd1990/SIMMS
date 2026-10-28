import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { existsSync, readFileSync } from "fs";
import path from "path";
import {
  CB_NAMEPLATE_FIELDS,
  CB_REPORT_TITLE,
  CB_TEMPLATE_CODE,
  MCT_CORE_FIELDS,
  MCT_NAMEPLATE_FIELDS,
  MCT_REPORT_TITLE,
  MCT_TEMPLATE_CODE,
  PCT_NAMEPLATE_FIELDS,
  PCT_REPORT_TITLE,
  PCT_TEMPLATE_CODE,
  fmt,
  toNum,
  type CbData,
  type EquipmentHeader,
  type MctData,
  type PctData,
} from "@/lib/equipment-types";
import { stampForName } from "@/lib/employee-stamps";
import { SignatureBlock, loadStampFile } from "@/lib/pdf-signature";

// PDF renderers for the 66 KV CB / MCT / PCT testing reports. Layout follows
// the client's Excel workbooks (name plate + test sheets + signature block).

const letterheadCache = new Map<string, Buffer | null>();

function loadLetterhead(): Buffer | null {
  const key = "letterhead";
  if (letterheadCache.has(key)) return letterheadCache.get(key) ?? null;
  const file = path.join(process.cwd(), "PDFHEADER", "pdf-top-header.jpeg");
  const buffer = existsSync(file) ? readFileSync(file) : null;
  letterheadCache.set(key, buffer);
  return buffer;
}

const S = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  letterhead: {
    width: "100%",
    marginBottom: 0,
    padding: 0,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0, borderBottomColor: "#149f93", paddingBottom: 6, marginBottom: 8 },
  company: { fontSize: 13, fontWeight: "bold", color: "#005b91" },
  topRight: { alignItems: "flex-end" },
  reportTitle: { fontSize: 9, fontWeight: "bold", color: "#005b91" },
  reportNo: { fontSize: 8, color: "#334155", marginTop: 2 },
  partyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 16 },
  partyText: { fontSize: 8.5, fontWeight: "bold" },
  mainTitle: { fontSize: 11, fontWeight: "bold", textAlign: "center", marginBottom: 8, color: "#0f172a" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8, borderWidth: 0.5, borderColor: "#cbd5e1" },
  metaCell: { width: "25%", paddingHorizontal: 5, paddingVertical: 3, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#e2e8f0" },
  metaLabel: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase" },
  metaValue: { fontSize: 8.5, fontWeight: "bold", color: "#0f172a", marginTop: 1 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 9.5, fontWeight: "bold", color: "#005b91", backgroundColor: "#e3f5f2", paddingHorizontal: 6, paddingVertical: 4, marginBottom: 4 },
  subTitle: { fontSize: 8, fontWeight: "bold", color: "#334155", marginTop: 6, marginBottom: 3 },
  table: { borderWidth: 0.5, borderColor: "#cbd5e1" },
  row: { flexDirection: "row" },
  th: { backgroundColor: "#f1f5f9", fontSize: 6.5, fontWeight: "bold", paddingHorizontal: 3, paddingVertical: 4, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#cbd5e1", textAlign: "center" },
  td: { fontSize: 7.5, paddingHorizontal: 3, paddingVertical: 3, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#e2e8f0", textAlign: "center" },
  footer: { marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  note: { fontSize: 7.5, color: "#475569", marginTop: 3, marginBottom: 3 },
});

function t(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/[µμ]/g, "u")
    .replace(/[Ω]/g, "Ohm")
    .replace(/[Øø]/g, "phi")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

type Col = { header: string; width: string; align?: "left" | "center" };

function rowHasData(row: string[], idCols: number[] = []): boolean {
  return row.some((cell, i) => !idCols.includes(i) && String(cell ?? "").trim() !== "");
}

function rowsHaveData(rows: string[][], idCols: number[] = []): boolean {
  return rows.some((row) => rowHasData(row, idCols));
}

function DataTable({ cols, rows, idCols = [] }: { cols: Col[]; rows: string[][]; idCols?: number[] }) {
  const visible = rows.filter((row) => rowHasData(row, idCols));
  if (visible.length === 0) return null;
  return (
    <View style={S.table}>
      <View style={S.row}>
        {cols.map((c, i) => (
          <Text key={i} style={[S.th, { width: c.width }]}>
            {t(c.header)}
          </Text>
        ))}
      </View>
      {visible.map((row, ri) => (
        <View key={ri} style={[S.row, ri % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]}>
          {cols.map((c, ci) => (
            <Text key={ci} style={[S.td, { width: c.width, textAlign: c.align ?? "center" }]}>
              {t(row[ci]) || "-"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function SubSection({ title, cols, rows, idCols = [] }: { title: string; cols: Col[]; rows: string[][]; idCols?: number[] }) {
  if (!rowsHaveData(rows, idCols)) return null;
  return (
    <View>
      <Text style={S.subTitle}>{title}</Text>
      <DataTable cols={cols} rows={rows} idCols={idCols} />
    </View>
  );
}

function SignatureArea({
  testedBy,
  witnessBy,
  testedByStamp,
  submittedBy,
}: {
  testedBy: string;
  witnessBy: string;
  testedByStamp?: string | null;
  submittedBy?: string | null;
}) {
  const stampUrl = stampForName(testedBy, testedByStamp);
  return (
    <SignatureBlock
      columns={[
        { label: "Tested By", name: t(testedBy), stamp: loadStampFile(stampUrl) },
        { label: "Witness By", name: t(witnessBy) },
      ]}
      submittedBy={submittedBy ? t(submittedBy) : null}
    />
  );
}

const kvCols: Col[] = [
  { header: "Description", width: "40%", align: "left" },
  { header: "Value", width: "60%", align: "left" },
];

function namePlateRows(fields: { key: string; label: string }[], data: Record<string, string>): string[][] {
  return fields.map((f) => [f.label, data[f.key] ?? ""]);
}

function HeaderMeta({ header }: { header: EquipmentHeader }) {
  const cells: [string, string][] = [
    ["Party Name", header.partyName],
    ["Switch Yard", header.switchYard],
    ["Project", header.projectName],
    ["EPC By", header.epcBy],
    ["Site", header.siteName],
    ["Date of Testing", header.dateOfTesting],
    ["Equipment", header.equipmentName],
    ["Sr. No.", header.srNo],
  ];
  return (
    <View style={S.metaGrid}>
      {cells
        .filter(([, value]) => String(value ?? "").trim() !== "")
        .map(([label, value]) => (
          <View key={label} style={S.metaCell}>
            <Text style={S.metaLabel}>{label}</Text>
            <Text style={S.metaValue}>{t(value)}</Text>
          </View>
        ))}
    </View>
  );
}

function Chrome({
  companyName,
  reportNumber,
  reportTitle,
  documentTitle,
  siteName,
  header,
}: {
  companyName: string;
  reportNumber: string;
  reportTitle: string;
  documentTitle: string;
  siteName?: string | null;
  header: EquipmentHeader;
}) {
  const letterhead = loadLetterhead();
  return (
    <>
      {letterhead ? <Image src={letterhead} style={S.letterhead} /> : null}

      <Text style={[S.mainTitle, { marginTop: letterhead ? 10 : 0 }]}>{documentTitle}</Text>

      <View style={S.partyRow}>
        <Text style={S.partyText}>PARTY NAME : {t(header.partyName) || "________________"}</Text>
        <Text style={S.partyText}>NAME OF SITE : {t(header.siteName) || "________________"}</Text>
      </View>

      <HeaderMeta header={header} />
    </>
  );
}

type PdfMeta = {
  siteName?: string | null;
  testingDate?: string | null;
  testedByName?: string | null;
  testedByStamp?: string | null;
};

// ------------------------------------------------------------
// 66 KV CB
// ------------------------------------------------------------

export function CbDocument({
  reportNumber,
  companyName,
  payload,
  meta,
}: {
  reportNumber: string;
  companyName: string;
  payload: CbData;
  meta: PdfMeta;
}) {
  const h = { ...payload.header, siteName: payload.header.siteName || meta.siteName || "", dateOfTesting: payload.header.dateOfTesting || meta.testingDate || "" };
  const sig = payload.signatures;

  const namePlate = namePlateRows(CB_NAMEPLATE_FIELDS, payload.namePlate as unknown as Record<string, string>);
  const irOff = payload.irOff.map((r) => [r.phase, r.aB, r.bC, r.aC]);
  const irOn = payload.irOn.map((r) => [r.phase, r.aB, r.bC, r.aC]);
  const operations = payload.operations.map((r) => [r.operation, r.mechanically, r.electricalLocal, r.electricalRemote]);
  const indications = payload.indications.map((r) => [r.description, r.statusInCrp]);
  const relays = payload.relayStatus.map((r) => [r.relay, r.description, r.statusInRelay, r.ledInRelay]);
  const crm = payload.crm.map((r) => {
    const values = [toNum(r.value1), toNum(r.value2), toNum(r.value3)].filter((n): n is number => n !== null);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    return [r.phase, r.value1, r.value2, r.value3, fmt(avg, 2)];
  });
  const timing = payload.timing.map((r) => [r.test, r.r, r.y, r.b]);
  const coil = payload.coil.map((r) => [r.location, r.resistance, r.current]);

  const anyNamePlate = rowsHaveData(namePlate, [0]) || rowsHaveData(payload.breakerSrNos.map((r) => [r.description, r.srNo]), [0]);
  const anyIr = rowsHaveData(irOff, [0]) || rowsHaveData(irOn, [0]);
  const anyOps = rowsHaveData(operations, [0]);
  const anyInd = rowsHaveData(indications, [0]);
  const anyRelay = rowsHaveData(relays, [0, 1]);
  const anyCrm = rowsHaveData(crm, [0]);
  const anyTiming = rowsHaveData(timing, [0]);
  const anyCoil =
    rowsHaveData(coil, [0]) ||
    Object.values(payload.springCharge).some((v) => String(v ?? "").trim() !== "");

  return (
    <Document title={`${reportNumber} - ${CB_REPORT_TITLE}`} author={companyName}>
      <Page size="A4" style={S.page} wrap>
        <Chrome
          companyName={companyName}
          reportNumber={reportNumber}
          reportTitle={CB_REPORT_TITLE}
          documentTitle="66 KV Circuit Breaker Testing Report"
          siteName={meta.siteName}
          header={h}
        />

        {anyNamePlate ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>1.  NAME PLATE DETAILS</Text>
            <SubSection title="Breaker Name Plate" cols={kvCols} rows={namePlate} idCols={[0]} />
            <SubSection
              title="Breaker Serial Numbers"
              cols={[
                { header: "Description", width: "60%", align: "left" },
                { header: "Sr. No.", width: "40%" },
              ]}
              rows={payload.breakerSrNos.map((r) => [r.description, r.srNo])}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyIr ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>2.  INSULATION RESISTANCE (IR) VALUES</Text>
            <SubSection
              title="IR Value (Breaker OFF) - MOhm"
              cols={[
                { header: "Phase", width: "25%" },
                { header: "A-B", width: "25%" },
                { header: "B-C", width: "25%" },
                { header: "A-C", width: "25%" },
              ]}
              rows={irOff}
              idCols={[0]}
            />
            <SubSection
              title="IR Value (Breaker ON) - MOhm"
              cols={[
                { header: "Phase", width: "25%" },
                { header: "A-B", width: "25%" },
                { header: "B-C", width: "25%" },
                { header: "A-C", width: "25%" },
              ]}
              rows={irOn}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyOps ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>3.  OPERATION CHECKS</Text>
            <DataTable
              cols={[
                { header: "Operation", width: "28%", align: "left" },
                { header: "Mechanically", width: "24%" },
                { header: "Electrical Local", width: "24%" },
                { header: "Electrical Remote", width: "24%" },
              ]}
              rows={operations}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyInd ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>4.  INDICATIONS</Text>
            <DataTable
              cols={[
                { header: "Description", width: "70%", align: "left" },
                { header: "Status in CRP", width: "30%" },
              ]}
              rows={indications}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyRelay ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>5.  RELAY STATUS</Text>
            <DataTable
              cols={[
                { header: "Relay", width: "26%", align: "left" },
                { header: "Description", width: "30%", align: "left" },
                { header: "Status in Relay", width: "22%" },
                { header: "LED in Relay", width: "22%" },
              ]}
              rows={relays}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {anyCrm ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>6.  CONTACT RESISTANCE MEASUREMENT (CRM) - uOhm</Text>
            <DataTable
              cols={[
                { header: "Phase", width: "16%" },
                { header: "Value 1", width: "20%" },
                { header: "Value 2", width: "20%" },
                { header: "Value 3", width: "20%" },
                { header: "Average", width: "24%" },
              ]}
              rows={crm}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyTiming ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>7.  TIMING TEST - ms</Text>
            <DataTable
              cols={[
                { header: "Test", width: "28%", align: "left" },
                { header: "R", width: "24%" },
                { header: "Y", width: "24%" },
                { header: "B", width: "24%" },
              ]}
              rows={timing}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyCoil ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>8.  COIL RESISTANCE, SPRING CHARGE & CONTROL VOLTAGE</Text>
            <SubSection
              title="Coil Resistance & Current"
              cols={[
                { header: "Location", width: "34%", align: "left" },
                { header: "Resistance (Ohm)", width: "33%" },
                { header: "Current (A)", width: "33%" },
              ]}
              rows={coil}
              idCols={[0]}
            />
            <View style={S.metaGrid}>
              {(
                [
                  ["Spring Charge Time (Sec)", payload.springCharge.time],
                  ["Spring Charge Current (A)", payload.springCharge.amp],
                  ["AC Voltage", payload.springCharge.acVoltage],
                  ["DC Voltage", payload.springCharge.dcVoltage],
                ] as [string, string][]
              )
                .filter(([, value]) => String(value ?? "").trim() !== "")
                .map(([label, value]) => (
                  <View key={label} style={S.metaCell}>
                    <Text style={S.metaLabel}>{label}</Text>
                    <Text style={S.metaValue}>{t(value)}</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}

        {payload.remarks ? <Text style={S.note}>Remarks: {t(payload.remarks)}</Text> : null}

        <View style={S.section} wrap={false}>
          <SignatureArea
            testedBy={sig.testedBy}
            witnessBy={sig.witnessBy}
            testedByStamp={meta.testedByStamp}
            submittedBy={meta.testedByName}
          />
        </View>
      </Page>
    </Document>
  );
}

// ------------------------------------------------------------
// 66 KV MCT
// ------------------------------------------------------------

export function MctDocument({
  reportNumber,
  companyName,
  payload,
  meta,
}: {
  reportNumber: string;
  companyName: string;
  payload: MctData;
  meta: PdfMeta;
}) {
  const h = { ...payload.header, siteName: payload.header.siteName || meta.siteName || "", dateOfTesting: payload.header.dateOfTesting || meta.testingDate || "" };
  const sig = payload.signatures;

  const namePlate = namePlateRows(MCT_NAMEPLATE_FIELDS, payload.namePlate as unknown as Record<string, string>);
  const core = namePlateRows(MCT_CORE_FIELDS, payload.core as unknown as Record<string, string>);
  const ratings = payload.ratings.map((r) => [r.particular, r.r, r.y, r.b]);
  const ir = payload.ir.map((r) => [r.testType, r.meggerUsed, r.r, r.y, r.b]);
  const winding = payload.winding.map((r) => [r.connection, r.r, r.y, r.b]);
  const polarity = payload.polarity.map((r) => [r.phase, r.core1]);
  const ratio = payload.ratio.map((r) => [r.phase, r.injectedCurrent, r.measured]);
  const series = [[payload.series.injectedPrimary, payload.series.ratio, payload.series.r, payload.series.y, payload.series.b]];

  const anyRatings = rowsHaveData(ratings, [0]);
  const anyIr = rowsHaveData(ir, [0, 1]);
  const anyWinding = rowsHaveData(winding, [0]);
  const anyPolarity = rowsHaveData(polarity, [0]);
  const anyRatio = rowsHaveData(ratio, [0, 1]);

  return (
    <Document title={`${reportNumber} - ${MCT_REPORT_TITLE}`} author={companyName}>
      <Page size="A4" style={S.page} wrap>
        <Chrome
          companyName={companyName}
          reportNumber={reportNumber}
          reportTitle={MCT_REPORT_TITLE}
          documentTitle="66 KV Metering Current Transformer Testing Report"
          siteName={meta.siteName}
          header={h}
        />

        {(rowsHaveData(namePlate, [0]) || rowsHaveData(core, [0])) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>1.  NAME PLATE & CORE DETAILS</Text>
            <SubSection title="CT Name Plate" cols={kvCols} rows={namePlate} idCols={[0]} />
            <SubSection title="Core Details" cols={kvCols} rows={core} idCols={[0]} />
          </View>
        ) : null}

        {anyRatings ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>2.  CAPACITANCE & TAN DELTA</Text>
            <DataTable
              cols={[
                { header: "Particular", width: "28%", align: "left" },
                { header: "R", width: "24%" },
                { header: "Y", width: "24%" },
                { header: "B", width: "24%" },
              ]}
              rows={ratings}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyIr ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>3.  INSULATION RESISTANCE (IR) TEST</Text>
            <DataTable
              cols={[
                { header: "Test", width: "34%", align: "left" },
                { header: "Megger Used", width: "16%" },
                { header: "R", width: "16.6%" },
                { header: "Y", width: "16.6%" },
                { header: "B", width: "16.8%" },
              ]}
              rows={ir}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {anyWinding ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>4.  SECONDARY WINDING RESISTANCE - Ohm</Text>
            <DataTable
              cols={[
                { header: "Connection", width: "28%", align: "left" },
                { header: "R", width: "24%" },
                { header: "Y", width: "24%" },
                { header: "B", width: "24%" },
              ]}
              rows={winding}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyPolarity ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>5.  POLARITY TEST</Text>
            <DataTable
              cols={[
                { header: "Phase", width: "40%" },
                { header: "Core - 1", width: "60%" },
              ]}
              rows={polarity}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyRatio ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>6.  RATIO TEST</Text>
            <DataTable
              cols={[
                { header: "Phase", width: "20%" },
                { header: "Injected Current (A)", width: "40%" },
                { header: "Measured Secondary Current (mA)", width: "40%" },
              ]}
              rows={ratio}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {(payload.connection.p1Side ||
          payload.connection.p2Side ||
          rowsHaveData(series)) ? (
        <View style={S.section} wrap={false}>
          <Text style={S.sectionTitle}>7.  CONNECTION & SERIES TEST</Text>
          <View style={S.metaGrid}>
            {(
              [
                ["P1 Side", payload.connection.p1Side],
                ["P2 Side", payload.connection.p2Side],
              ] as [string, string][]
            )
              .filter(([, value]) => String(value ?? "").trim() !== "")
              .map(([label, value]) => (
                <View key={label} style={[S.metaCell, { width: "50%" }]}>
                  <Text style={S.metaLabel}>{label}</Text>
                  <Text style={S.metaValue}>{t(value)}</Text>
                </View>
              ))}
          </View>
          <SubSection
            title="Series Test"
            cols={[
              { header: "Injected Primary (A)", width: "24%" },
              { header: "Ratio", width: "19%" },
              { header: "R", width: "19%" },
              { header: "Y", width: "19%" },
              { header: "B", width: "19%" },
            ]}
            rows={series}
          />
        </View>
        ) : null}

        {payload.remarks ? <Text style={S.note}>Remarks: {t(payload.remarks)}</Text> : null}

        <View style={S.section} wrap={false}>
          <SignatureArea
            testedBy={sig.testedBy}
            witnessBy={sig.witnessBy}
            testedByStamp={meta.testedByStamp}
            submittedBy={meta.testedByName}
          />
        </View>
      </Page>
    </Document>
  );
}

// ------------------------------------------------------------
// 66 KV PCT
// ------------------------------------------------------------

export function PctDocument({
  reportNumber,
  companyName,
  payload,
  meta,
}: {
  reportNumber: string;
  companyName: string;
  payload: PctData;
  meta: PdfMeta;
}) {
  const h = { ...payload.header, siteName: payload.header.siteName || meta.siteName || "", dateOfTesting: payload.header.dateOfTesting || meta.testingDate || "" };
  const sig = payload.signatures;

  const namePlate = namePlateRows(PCT_NAMEPLATE_FIELDS, payload.namePlate as unknown as Record<string, string>);
  const coreRows = payload.cores.map((c) => [
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
  const ratings = payload.ratings.map((r) => [r.particular, r.r, r.y, r.b]);
  const ir = payload.ir.map((r) => [r.testType, r.meggerUsed, r.r, r.y, r.b]);
  const winding = payload.winding.map((r) => [r.connection, r.r, r.y, r.b]);
  const polarity = payload.polarity.map((r) => [r.phase, r.core1, r.core2, r.core3, r.core4]);
  const coreId = payload.coreIdentification.map((r) => [r.stage, r.phase, r.core1, r.core2, r.core3, r.core4]);
  const ratio = payload.ratio.map((r) => [
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
  const knee = payload.kneePoint.map((r) => [r.core, r.step, r.appliedVoltage, r.r, r.y, r.b]);
  const series = payload.series.map((r) => [r.description, r.backupPrimary, r.backupSecondary, r.diffPrimary, r.diffSecondary]);
  const metering = payload.meteringProtection.map((r) => [r.description, r.meteringCore, r.protectionCore, r.diffCore]);
  const meters = payload.meterReadings.map((r) => [r.description, r.mfm1, r.mfm2, r.aMeter]);

  const anyRatings = rowsHaveData(ratings, [0]);
  const anyIr = rowsHaveData(ir, [0, 1]);
  const anyWinding = rowsHaveData(winding, [0]);
  const anyPolarity = rowsHaveData(polarity, [0]);
  const anyCoreId = rowsHaveData(coreId, [0, 1]) || String(payload.coreIdInjected).trim() !== "" || String(payload.coreIdRatio).trim() !== "";
  const anyRatio = rowsHaveData(ratio, [0, 1]);
  const anyKnee = rowsHaveData(knee, [0, 1, 2]);
  const anySeries = rowsHaveData(series, [0]) || rowsHaveData(metering, [0]) || rowsHaveData(meters, [0]);
  const connectionEntries = (
    [
      ["P1 Side", payload.connection.p1Side],
      ["P2 Side", payload.connection.p2Side],
      ["Primary Injected", payload.connection.primaryInjected],
      ["Ratio", payload.connection.ratio],
      ["D1-1 / D7-1", payload.connection.d11D71],
      ["D3-1 / D7-1", payload.connection.d31D71],
      ["D5-1 / D7-1", payload.connection.d51D71],
      ["C1-1 / C7-1", payload.connection.c11C71],
      ["C3-1 / C7-1", payload.connection.c31C71],
      ["C5-1 / C7-1", payload.connection.c51C71],
      ["A1-1 / A7-1", payload.connection.a11A71],
      ["A3-1 / A7-1", payload.connection.a31A71],
      ["A5-1 / A7-1", payload.connection.a51A71],
    ] as [string, string][]
  ).filter(([, value]) => String(value ?? "").trim() !== "");

  return (
    <Document title={`${reportNumber} - ${PCT_REPORT_TITLE}`} author={companyName}>
      <Page size="A4" style={S.page} wrap>
        <Chrome
          companyName={companyName}
          reportNumber={reportNumber}
          reportTitle={PCT_REPORT_TITLE}
          documentTitle="66 KV Protection Current Transformer Testing Report"
          siteName={meta.siteName}
          header={h}
        />

        {(rowsHaveData(namePlate, [0]) || rowsHaveData(coreRows, [0])) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>1.  NAME PLATE & CORE DETAILS</Text>
            <SubSection title="CT Name Plate" cols={kvCols} rows={namePlate} idCols={[0]} />
            <SubSection
              title="Core Details"
              cols={[
                { header: "Core", width: "9%" },
                { header: "Ratio (P)", width: "10%" },
                { header: "Ratio (S)", width: "10%" },
                { header: "Burden", width: "10%" },
                { header: "Accuracy", width: "11%" },
                { header: "ALF/ISF", width: "11%" },
                { header: "Min. KPV", width: "13%" },
                { header: "Lex @600/1A", width: "13%" },
                { header: "Rct @75C", width: "13%" },
              ]}
              rows={coreRows}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyRatings ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>2.  CAPACITANCE & TAN DELTA</Text>
            <DataTable
              cols={[
                { header: "Particular", width: "28%", align: "left" },
                { header: "R", width: "24%" },
                { header: "Y", width: "24%" },
                { header: "B", width: "24%" },
              ]}
              rows={ratings}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyIr ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>3.  INSULATION RESISTANCE (IR) TEST</Text>
            <DataTable
              cols={[
                { header: "Test", width: "34%", align: "left" },
                { header: "Megger Used", width: "16%" },
                { header: "R", width: "16.6%" },
                { header: "Y", width: "16.6%" },
                { header: "B", width: "16.8%" },
              ]}
              rows={ir}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {anyWinding ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>4.  SECONDARY WINDING RESISTANCE - Ohm</Text>
            <DataTable
              cols={[
                { header: "Connection", width: "28%", align: "left" },
                { header: "R", width: "24%" },
                { header: "Y", width: "24%" },
                { header: "B", width: "24%" },
              ]}
              rows={winding}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyPolarity ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>5.  POLARITY TEST</Text>
            <DataTable
              cols={[
                { header: "Phase", width: "14%", align: "left" },
                { header: "Core - 1", width: "21.5%" },
                { header: "Core - 2", width: "21.5%" },
                { header: "Core - 3", width: "21.5%" },
                { header: "Core - 4", width: "21.5%" },
              ]}
              rows={polarity}
              idCols={[0]}
            />
          </View>
        ) : null}

        {anyCoreId ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>6.  CORE IDENTIFICATION TEST</Text>
            {(payload.coreIdInjected || payload.coreIdRatio) ? (
              <Text style={S.note}>
                Injected: {t(payload.coreIdInjected) || "-"} | Ratio: {t(payload.coreIdRatio) || "-"}
              </Text>
            ) : null}
            <DataTable
              cols={[
                { header: "Stage", width: "31%", align: "left" },
                { header: "Phase", width: "11%" },
                { header: "Core - 1", width: "14.5%" },
                { header: "Core - 2", width: "14.5%" },
                { header: "Core - 3", width: "14.5%" },
                { header: "Core - 4", width: "14.5%" },
              ]}
              rows={coreId}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {anyRatio ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>7.  RATIO TEST</Text>
            <DataTable
              cols={[
                { header: "Phase", width: "9%" },
                { header: "Injected (A)", width: "10%" },
                { header: "C1 600/1", width: "10.1%" },
                { header: "C1 300/1", width: "10.1%" },
                { header: "C2 600/1", width: "10.1%" },
                { header: "C2 300/1", width: "10.1%" },
                { header: "C3 600/1", width: "10.1%" },
                { header: "C3 300/1", width: "10.1%" },
                { header: "C4 600/1", width: "10.1%" },
                { header: "C4 300/1", width: "10.3%" },
              ]}
              rows={ratio}
              idCols={[0, 1]}
            />
          </View>
        ) : null}

        {anyKnee ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>8.  KNEE POINT TEST</Text>
            <DataTable
              cols={[
                { header: "Core", width: "27%", align: "left" },
                { header: "Step", width: "17%" },
                { header: "Applied Voltage (V)", width: "18%" },
                { header: "R", width: "12.6%" },
                { header: "Y", width: "12.6%" },
                { header: "B", width: "12.8%" },
              ]}
              rows={knee}
              idCols={[0, 1, 2]}
            />
          </View>
        ) : null}

        {(connectionEntries.length > 0 || anySeries) ? (
        <View style={S.section} wrap={false}>
          <Text style={S.sectionTitle}>9.  CONNECTION, SERIES & METERING TEST</Text>
          <View style={S.metaGrid}>
            {connectionEntries.map(([label, value]) => (
              <View key={label} style={S.metaCell}>
                <Text style={S.metaLabel}>{label}</Text>
                <Text style={S.metaValue}>{t(value)}</Text>
              </View>
            ))}
          </View>

          {anySeries ? (
            <>
              <SubSection
                title="Series Test"
                cols={[
                  { header: "Phase", width: "16%", align: "left" },
                  { header: "Backup Primary", width: "21%" },
                  { header: "Backup Secondary", width: "21%" },
                  { header: "Diff Primary", width: "21%" },
                  { header: "Diff Secondary", width: "21%" },
                ]}
                rows={series}
                idCols={[0]}
              />
              <SubSection
                title="Metering / Protection / Differential Cores"
                cols={[
                  { header: "Phase", width: "28%", align: "left" },
                  { header: "Metering Core", width: "24%" },
                  { header: "Protection Core", width: "24%" },
                  { header: "Diff. Core", width: "24%" },
                ]}
                rows={metering}
                idCols={[0]}
              />
              <SubSection
                title="Meter Readings (kW / kVA / kWh)"
                cols={[
                  { header: "Phase", width: "28%", align: "left" },
                  { header: "MFM-1", width: "24%" },
                  { header: "MFM-2", width: "24%" },
                  { header: "A-Meter", width: "24%" },
                ]}
                rows={meters}
                idCols={[0]}
              />
            </>
          ) : null}
        </View>
        ) : null}

        {payload.remarks ? <Text style={S.note}>Remarks: {t(payload.remarks)}</Text> : null}

        <View style={S.section} wrap={false}>
          <SignatureArea
            testedBy={sig.testedBy}
            witnessBy={sig.witnessBy}
            testedByStamp={meta.testedByStamp}
            submittedBy={meta.testedByName}
          />
        </View>
      </Page>
    </Document>
  );
}

import { MPT_TEMPLATE_CODE, PPT_TEMPLATE_CODE, PT_NAMEPLATE_FIELDS, type PtData } from "@/lib/equipment-types";

export function PtDocument({
  reportNumber,
  companyName,
  payload,
  meta,
}: {
  reportNumber: string;
  companyName: string;
  payload: PtData;
  meta: PdfMeta;
}) {
  const h = { ...payload.header, siteName: payload.header.siteName || meta.siteName || "", dateOfTesting: payload.header.dateOfTesting || meta.testingDate || "" };
  const sig = payload.signatures;

  const namePlate = namePlateRows(PT_NAMEPLATE_FIELDS, payload.namePlate as unknown as Record<string, string>);
  const tan = payload.tanDelta.map((r) => [r.particular, r.r, r.y, r.b]);
  const ir = payload.ir.map((r) => [r.status, r.meggerUsed, r.r, r.y, r.b]);
  const pol = payload.polarity.map((r) => (r.core2 ? [r.phase, r.core1, r.core2] : [r.phase, r.core1]));
  const meas = payload.ratioMeasured.map((m) => [m.coreName, m.r1n, m.r1y1, m.y1n, m.y1b1, m.b1n, m.b1r1]);

  const isBus = payload.templateCode === PPT_TEMPLATE_CODE;
  const title = isBus ? "66KV BUS PT Testing Report" : "66KV Line Metering PT Testing Report";

  return (
    <Document title={`${reportNumber} - ${isBus ? "66 KV BUS PT TESTING REPORT" : "66 KV METERING PT TESTING REPORT"}`} author={companyName}>
      <Page size="A4" style={S.page} wrap>
        <Chrome
          companyName={companyName}
          reportNumber={reportNumber}
          reportTitle={isBus ? "66 KV BUS PT TESTING REPORT" : "66 KV METERING PT TESTING REPORT"}
          documentTitle={title}
          siteName={meta.siteName}
          header={h}
        />

        {(rowsHaveData(namePlate, [0]) || payload.cores.length) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>1.  NAME PLATE & CORE DETAILS</Text>
            <SubSection title="PT Name Plate" cols={kvCols} rows={namePlate} idCols={[0]} />
            <SubSection
              title="Core Details"
              cols={[
                { header: "Core Ref", width: "16%", align: "left" },
                { header: "Ratio (P)", width: "16%" },
                { header: "Ratio (S)", width: "16%" },
                { header: "Burden (VA)", width: "16%" },
                { header: "Class", width: "16%" },
                { header: "Terminal", width: "20%" },
              ]}
              rows={payload.cores.map((c) => [c.coreReference, c.primaryRatio, c.secondaryRatio, c.ratedBurden, c.accuracyClass, c.terminal])}
              idCols={[0]}
            />
          </View>
        ) : null}

        {rowsHaveData(tan.map((row) => row.slice(1))) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>2.  CAPACITANCE & TAN DELTA</Text>
            <DataTable cols={[{ header: "Particular", width: "40%", align: "left" }, { header: "R", width: "20%" }, { header: "Y", width: "20%" }, { header: "B", width: "20%" }]} rows={tan} idCols={[0]} />
          </View>
        ) : null}

        {rowsHaveData(ir.map((row) => row.slice(2))) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>3.  INSULATION RESISTANCE (IR) TEST</Text>
            <DataTable cols={[{ header: "Test", width: "34%", align: "left" }, { header: "Megger Used", width: "16%" }, { header: "R", width: "16.6%" }, { header: "Y", width: "16.6%" }, { header: "B", width: "16.8%" }]} rows={ir} idCols={[0, 1]} />
          </View>
        ) : null}

        {payload.polarity.some((p) => p.core1 || p.core2) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>4.  POLARITY TEST</Text>
            <DataTable cols={payload.polarity.some((p) => p.core2) ? [{ header: "Phase", width: "25%" }, { header: "Core - 1", width: "37.5%" }, { header: "Core - 2", width: "37.5%" }] : [{ header: "Phase", width: "40%" }, { header: "Core - 1", width: "60%" }]} rows={pol} idCols={[0]} />
            {payload.remarks ? <Text style={S.note}>Remarks: {t(payload.remarks)}</Text> : null}
          </View>
        ) : null}

        {(Object.values(payload.ratioApplied).some(Boolean) || payload.ratioMeasured.some((m) => m.r1n || m.y1n || m.b1n)) ? (
          <View style={S.section} wrap={false}>
            <Text style={S.sectionTitle}>5.  RATIO TEST</Text>
            <Text style={S.note}>3-Φ, 440 V applied on HV Side & Secondary Measured</Text>
            {Object.values(payload.ratioApplied).some(Boolean) ? (
              <View style={S.metaGrid}>
                {(
                  [
                    ["RY", payload.ratioApplied.ry],
                    ["YB", payload.ratioApplied.yb],
                    ["BR", payload.ratioApplied.br],
                    ["RN", payload.ratioApplied.rn],
                    ["YN", payload.ratioApplied.yn],
                    ["BN", payload.ratioApplied.bn],
                  ] as [string, string][]
                )
                  .filter(([, value]) => String(value ?? "").trim() !== "")
                  .map(([label, value]) => (
                    <View key={label} style={[S.metaCell, { width: "16.66%" }]}>
                      <Text style={S.metaLabel}>{label}</Text>
                      <Text style={S.metaValue}>{t(value)}</Text>
                    </View>
                  ))}
              </View>
            ) : null}
            {payload.ratioMeasured.some((m) => m.r1n || m.y1n || m.b1n) ? (
              <SubSection
                title="Secondary Measured Voltage"
                cols={[
                  { header: "Core", width: "14%", align: "left" },
                  { header: "R1a-R1n", width: "14.3%" },
                  { header: "R1a-Y1a", width: "14.3%" },
                  { header: "Y1a-Y1n", width: "14.3%" },
                  { header: "Y1a-B1a", width: "14.3%" },
                  { header: "B1a-B1n", width: "14.3%" },
                  { header: "B1a-R1a", width: "14.5%" },
                ]}
                rows={meas}
                idCols={[0]}
              />
            ) : null}
          </View>
        ) : null}

        <View style={S.section} wrap={false}>
          <SignatureArea
            testedBy={sig.testedBy}
            witnessBy={sig.witnessBy}
            testedByStamp={meta.testedByStamp}
            submittedBy={meta.testedByName}
          />
        </View>
      </Page>
    </Document>
  );
}

export const EQUIPMENT_TEMPLATE_CODES = [CB_TEMPLATE_CODE, MCT_TEMPLATE_CODE, PCT_TEMPLATE_CODE, MPT_TEMPLATE_CODE, PPT_TEMPLATE_CODE];
