import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  type PowerTrData,
  POWER_TR_REPORT_TITLE,
  calcCalRatio,
  calcMaxLimit,
  calcMinLimit,
  calcPi,
  calcRatioError,
  fmt,
} from "@/lib/power-tr-types";

// Excel-format Power Transformer (Star-Star) test report.
// Layout follows the seven sheets of "POWER TR TESTING REPORT(STAR STAR TR)".

const S = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#149f93", paddingBottom: 6, marginBottom: 8 },
  company: { fontSize: 13, fontWeight: "bold", color: "#005b91" },
  topRight: { alignItems: "flex-end" },
  reportTitle: { fontSize: 9, fontWeight: "bold", color: "#005b91" },
  reportNo: { fontSize: 8, color: "#334155", marginTop: 2 },
  partyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  partyText: { fontSize: 9, fontWeight: "bold" },
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
  sigBlock: { flexGrow: 1, paddingRight: 10 },
  sigLabel: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase" },
  sigValue: { fontSize: 8, marginTop: 2, borderTopWidth: 0.5, borderTopColor: "#94a3b8", paddingTop: 2 },
  note: { fontSize: 7.5, color: "#475569", marginTop: 3, marginBottom: 3 },
});

// Replace characters the PDF core font cannot render.
function t(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/[µμ]/g, "u")
    .replace(/[Ω]/g, "Ohm")
    .replace(/[Øø]/g, "phi")
    .replace(/[–—]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

type Col = { header: string; width: string; align?: "left" | "center" };

function DataTable({ cols, rows }: { cols: Col[]; rows: string[][] }) {
  return (
    <View style={S.table}>
      <View style={S.row}>
        {cols.map((c, i) => (
          <Text key={i} style={[S.th, { width: c.width }]}>
            {t(c.header)}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
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

function SignatureBlock({ testedBy, witnessBy }: { testedBy: string; witnessBy: string }) {
  return (
    <View style={S.footer}>
      <View style={S.sigBlock}>
        <Text style={S.sigLabel}>Tested By</Text>
        <Text style={S.sigValue}>{t(testedBy) || "________________"}</Text>
      </View>
      <View style={S.sigBlock}>
        <Text style={S.sigLabel}>Witness By</Text>
        <Text style={S.sigValue}>{t(witnessBy) || "________________"}</Text>
      </View>
    </View>
  );
}

export function PowerTrDocument({
  reportNumber,
  companyName,
  payload,
  meta,
}: {
  reportNumber: string;
  companyName: string;
  payload: PowerTrData;
  meta: { siteName?: string | null; testingDate?: string | null; testedByName?: string | null };
}) {
  const { header: h } = payload;
  const sig = payload.signatures;

  const metaCells: [string, string][] = [
    ["Make", h.make],
    ["Date of Testing", h.dateOfTesting || meta.testingDate || ""],
    ["Sr. No.", h.srNo],
    ["Rating", h.rating],
    ["% Impedance", h.percentImpedance],
    ["HV Amp.", h.hvAmp],
    ["Vector Group", h.vectorGroup],
    ["LV Amp.", h.lvAmp],
    ["Qty. of Oil", h.qtyOfOil],
    ["HV Volts", h.hvVolts],
    ["Year of Mfg.", h.yearOfMfg],
    ["LV Volts", h.lvVolts],
  ];

  return (
    <Document title={`${reportNumber} - ${POWER_TR_REPORT_TITLE}`} author={companyName}>
      <Page size="A4" style={S.page} wrap>
        <View style={S.topRow}>
          <View>
            <Text style={S.company}>{t(companyName)}</Text>
            <Text style={{ fontSize: 7.5, color: "#64748b", marginTop: 2 }}>
              {t(meta.siteName) || "Commissioning Test Report"}
            </Text>
          </View>
          <View style={S.topRight}>
            <Text style={S.reportTitle}>{POWER_TR_REPORT_TITLE}</Text>
            <Text style={S.reportNo}>Report No: {t(reportNumber)}</Text>
          </View>
        </View>

        <Text style={S.mainTitle}>
          {t(h.mva) ? `${t(h.mva)} MVA, ` : ""}66/33 KV TR. TESTING REPORT
        </Text>

        <View style={S.partyRow}>
          <Text style={S.partyText}>PARTY NAME : {t(h.partyName) || "________________"}</Text>
          <Text style={S.partyText}>NAME OF SUB-STATION : {t(h.substationName) || "________________"}</Text>
        </View>

        <View style={S.metaGrid}>
          {metaCells.map(([label, value]) => (
            <View key={label} style={S.metaCell}>
              <Text style={S.metaLabel}>{label}</Text>
              <Text style={S.metaValue}>{t(value) || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Sheet 1 — Ratio Test */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>1.  RATIO TEST</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "6%" },
              { header: "HV Voltage", width: "9%" },
              { header: "LV Voltage", width: "9%" },
              { header: "Cal. Ratio", width: "9%" },
              { header: "R %Err", width: "7%" },
              { header: "R Actual", width: "8%" },
              { header: "R mA", width: "6%" },
              { header: "Y %Err", width: "7%" },
              { header: "Y Actual", width: "8%" },
              { header: "Y mA", width: "6%" },
              { header: "B %Err", width: "7%" },
              { header: "B Actual", width: "8%" },
              { header: "B mA", width: "6%" },
              { header: "Max", width: "7%" },
              { header: "Min", width: "7%" },
            ]}
            rows={payload.ratio.map((r) => {
              const cal = calcCalRatio(r.hvVoltage, r.lvVoltage);
              return [
                String(r.tap),
                r.hvVoltage,
                r.lvVoltage,
                fmt(cal, 4),
                fmt(calcRatioError(r.rActualRatio, cal), 3),
                r.rActualRatio,
                r.rMa,
                fmt(calcRatioError(r.yActualRatio, cal), 3),
                r.yActualRatio,
                r.yMa,
                fmt(calcRatioError(r.bActualRatio, cal), 3),
                r.bActualRatio,
                r.bMa,
                fmt(calcMaxLimit(cal), 4),
                fmt(calcMinLimit(cal), 4),
              ];
            })}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 2 — Voltage Ratio Test */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>2.  VOLTAGE RATIO TEST</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "12%" },
              { header: "R HV", width: "14%" },
              { header: "R LV", width: "14%" },
              { header: "Y HV", width: "15%" },
              { header: "Y LV", width: "15%" },
              { header: "B HV", width: "15%" },
              { header: "B LV", width: "15%" },
            ]}
            rows={payload.voltageRatio.map((r) => [String(r.tap), r.rHv, r.rLv, r.yHv, r.yLv, r.bHv, r.bLv])}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 3 — MB / Short Circuit */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>3.  MAGNETIC BALANCE & SHORT CIRCUIT TEST</Text>
          <Text style={S.subTitle}>Magnetic Balance Test (HV Side) - 1-phase applied on HV Side</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "10%" },
              { header: "Voltage Applied", width: "16%" },
              { header: "RN", width: "12%" },
              { header: "YN", width: "12%" },
              { header: "BN", width: "12%" },
              { header: "rn", width: "13%" },
              { header: "yn", width: "13%" },
              { header: "bn", width: "12%" },
            ]}
            rows={payload.mbHv.map((r) => [String(r.tap), r.voltageApplied, r.rn, r.yn, r.bn, r.lvRn, r.lvYn, r.lvBn])}
          />
          <Text style={S.subTitle}>Magnetic Balance Test (LV Side) - 1-phase applied on LV Side</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "15%" },
              { header: "Voltage Applied", width: "25%" },
              { header: "rn", width: "20%" },
              { header: "yn", width: "20%" },
              { header: "bn", width: "20%" },
            ]}
            rows={payload.mbLv.map((r) => [String(r.tap), r.voltageApplied, r.rn, r.yn, r.bn])}
          />
          <Text style={S.subTitle}>Short Circuit Test - 3-phase applied on HV Side & Secondary Shorted</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "11%" },
              { header: "HV R", width: "12%" },
              { header: "HV Y", width: "12%" },
              { header: "HV B", width: "12%" },
              { header: "LV r", width: "12%" },
              { header: "LV y", width: "12%" },
              { header: "LV b", width: "12%" },
              { header: "n (mA)", width: "17%" },
            ]}
            rows={payload.shortCircuit.map((r) => [String(r.tap), r.hvR, r.hvY, r.hvB, r.lvR, r.lvY, r.lvB, r.lvN])}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 4 — Charging Current */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>4.  CHARGING / MAGNETIZING CURRENT TEST</Text>
          <Text style={S.subTitle}>Magnetizing Current Test (HV Side) - 440V applied on HV Side</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "25%" },
              { header: "R (mA)", width: "25%" },
              { header: "Y (mA)", width: "25%" },
              { header: "B (mA)", width: "25%" },
            ]}
            rows={payload.chargingHv.map((r) => [String(r.tap), r.r, r.y, r.b])}
          />
          <Text style={S.subTitle}>Magnetizing Current Test (LV Side) - 440V applied on LV Side</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "25%" },
              { header: "R (mA)", width: "25%" },
              { header: "Y (mA)", width: "25%" },
              { header: "B (mA)", width: "25%" },
            ]}
            rows={payload.chargingLv.map((r) => [String(r.tap), r.r, r.y, r.b])}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 5 — Winding Resistance */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>5.  WINDING RESISTANCE MEASUREMENT</Text>
          <Text style={S.subTitle}>HV Winding - Resistance (mOhm)</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "25%" },
              { header: "R-Y", width: "25%" },
              { header: "Y-B", width: "25%" },
              { header: "B-R", width: "25%" },
            ]}
            rows={payload.windingHv.map((r) => [String(r.tap), r.ry, r.yb, r.br])}
          />
          <Text style={S.subTitle}>LV Winding - Resistance (mOhm)</Text>
          <DataTable
            cols={[
              { header: "Tap No.", width: "25%" },
              { header: "r-y", width: "25%" },
              { header: "y-b", width: "25%" },
              { header: "b-r", width: "25%" },
            ]}
            rows={payload.windingLv.map((r) => [String(r.tap), r.ry, r.yb, r.br])}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 6 — Vector Group / IR / BDV */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>6.  VECTOR GROUP CHECK / IR VALUE / BDV TEST</Text>
          <Text style={S.subTitle}>Vector Group Check Test - 3-phase applied on HV Side & R-r Shorted</Text>
          <DataTable
            cols={[
              { header: "Yy", width: "16.6%" },
              { header: "Rn", width: "16.6%" },
              { header: "Bb", width: "16.6%" },
              { header: "nN", width: "16.6%" },
              { header: "Yb", width: "16.6%" },
              { header: "RN", width: "17%" },
            ]}
            rows={[[payload.vectorGroup.yy, payload.vectorGroup.rn, payload.vectorGroup.bb, payload.vectorGroup.nn, payload.vectorGroup.yb, payload.vectorGroup.rnUpper]]}
          />
          <Text style={S.note}>Result: YNyn0 Vector Group is Confirmed (Bb = Yy OR Rn + nN = RN).</Text>

          <Text style={S.subTitle}>IR Value of Power Transformer</Text>
          <DataTable
            cols={[
              { header: "Description", width: "28%" },
              { header: "Voltage", width: "18%" },
              { header: "1 Minute (GOhm)", width: "18%" },
              { header: "10 Minute (GOhm)", width: "18%" },
              { header: "PI", width: "18%" },
            ]}
            rows={payload.ir.map((r) => [r.description, r.voltage, r.oneMin, r.tenMin, fmt(calcPi(r.oneMin, r.tenMin), 3)])}
          />
          <Text style={S.note}>
            IR Tester (Megger): Make {t(payload.megger.make) || "-"} | Sr. No. {t(payload.megger.srNo) || "-"} | Voltage {t(payload.megger.voltage) || "-"}
          </Text>

          <Text style={S.subTitle}>BDV Test of Oil (kV)</Text>
          <DataTable
            cols={[
              { header: "Description", width: "40%" },
              { header: "Before Filtration", width: "30%" },
              { header: "After Filtration", width: "30%" },
            ]}
            rows={payload.bdv.map((r) => [r.description, r.before, r.after])}
          />
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {/* Sheet 7 — Tan Delta */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>7.  TAN DELTA & CAPACITANCE TEST OF POWER TRANSFORMER</Text>
          <View style={S.metaGrid}>
            {(
              [
                ["Name of S/S", payload.tanDeltaHeader.nameOfSs],
                ["Name of Equipment", payload.tanDeltaHeader.nameOfEquipment],
                ["Make", payload.tanDeltaHeader.make],
                ["Serial No", payload.tanDeltaHeader.serialNo],
                ["OTI", payload.tanDeltaHeader.oti],
                ["Humidity", payload.tanDeltaHeader.humidity],
                ["Date of Testing", payload.tanDeltaHeader.dateOfTesting],
                ["Vector Group", payload.tanDeltaHeader.vectorGroup],
                ["MFG Year", payload.tanDeltaHeader.mfgYear],
                ["Ambient Temperature", payload.tanDeltaHeader.ambientTemp],
                ["WTI", payload.tanDeltaHeader.wti],
                ["Impedance (%)", payload.tanDeltaHeader.impedance],
              ] as [string, string][]
            ).map(([label, value]) => (
              <View key={label} style={S.metaCell}>
                <Text style={S.metaLabel}>{label}</Text>
                <Text style={S.metaValue}>{t(value) || "-"}</Text>
              </View>
            ))}
          </View>

          <Text style={S.subTitle}>Capacitance & Tan Delta Measurement of HV Bushing</Text>
          <DataTable
            cols={[
              { header: "Phase", width: "10%" },
              { header: "Make", width: "14%" },
              { header: "Sr. No.", width: "20%" },
              { header: "Cap @2kV (pF)", width: "14%" },
              { header: "Cap @10kV (pF)", width: "14%" },
              { header: "DF @2kV (%)", width: "14%" },
              { header: "DF @10kV (%)", width: "14%" },
            ]}
            rows={(["r", "y", "b"] as const).map((p) => {
              const b = payload.hvBushing[p];
              return [p.toUpperCase(), b.make, b.srNo, b.cap2kv, b.cap10kv, b.df2kv, b.df10kv];
            })}
          />

          <Text style={S.subTitle}>Capacitance & Tan Delta Measurement of Windings</Text>
          <DataTable
            cols={[
              { header: "Name of Phase", width: "20%" },
              { header: "Test Mode", width: "16%" },
              { header: "V1", width: "8%" },
              { header: "Cap (pF)", width: "10%" },
              { header: "DF (%)", width: "10%" },
              { header: "V2", width: "8%" },
              { header: "Cap (pF)", width: "10%" },
              { header: "DF (%)", width: "10%" },
            ]}
            rows={payload.windingTanDelta.map((r) => [r.nameOfPhase, r.testMode, r.appliedVoltage1, r.cap1, r.df1, r.appliedVoltage2, r.cap2, r.df2])}
          />
          {payload.tanDeltaRemarks ? <Text style={S.note}>Remarks: {t(payload.tanDeltaRemarks)}</Text> : null}
          <SignatureBlock testedBy={sig.testedBy} witnessBy={sig.witnessBy} />
        </View>

        {meta.testedByName ? (
          <Text style={{ fontSize: 7, color: "#64748b", marginTop: 4 }}>Submitted by: {t(meta.testedByName)}</Text>
        ) : null}
      </Page>
    </Document>
  );
}
