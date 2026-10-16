import type { TestStatus } from "@prisma/client";
import type { PowerTrData } from "@/lib/power-tr-types";

// The form payload contract shared between the mobile app and the server.
// Most readings are stored as strings to mirror the Excel-based sheets.

export type CoreRow = {
  id?: string;
  coreName: string;
  coreReference?: string;
  primaryRatio?: string;
  secondaryRatio?: string;
  ratedBurden?: string;
  accuracyClass?: string;
  alfIsf?: string;
  minimumKPV?: string;
  lexAt6001A?: string;
  rctAt75C?: string;
};

export type ChecklistRow = {
  testName: string;
  readings?: string;
  remarks?: string;
  status: TestStatus | "PASS" | "FAIL";
  testedBy?: string;
};

export type ThreePhase = { rPhase?: string; yPhase?: string; bPhase?: string };

export type InsulationRow = {
  testType?: string;
  status: TestStatus | "PASS" | "FAIL";
  meggerUsed?: string;
  rPhase?: string;
  yPhase?: string;
  bPhase?: string;
  remarks?: string;
};

export type WindingRow = {
  connection?: string;
  value?: string;
  rPhase?: string;
  yPhase?: string;
  bPhase?: string;
};

export type PolarityRow = {
  phase?: string;
  core1?: string;
  core2?: string;
  core3?: string;
  core4?: string;
  remarks?: string;
};

export type CoreIdentificationRow = {
  stage?: string;
  phase?: string;
  injectedCurrent?: string;
  ratio?: string;
  core1?: string;
  core2?: string;
  core3?: string;
  core4?: string;
};

export type RatioRow = {
  phase?: string;
  injectedCurrent?: string;
  measuredSecondary?: string;
  core1?: string;
  core2?: string;
  core3?: string;
  core4?: string;
  ratio?: string;
  remarks?: string;
};

export type KneePointRow = {
  kvStep?: string;
  kneePointVoltage?: string;
  lex?: string;
  testCurrent?: string;
  core?: string;
  appliedVoltage?: string;
  rPhase?: string;
  yPhase?: string;
  bPhase?: string;
  remarks?: string;
};

export type CapacitanceRow = {
  particular?: string;
  srNo?: string;
  capacitance?: string;
  tanDelta?: string;
  remarks?: string;
};

export type SeriesRow = {
  description?: string;
  backupRelay?: string;
  aMeter?: string;
  mfm?: string;
  pqmMeter?: string;
  primary?: string;
  secondary?: string;
  rPhase?: string;
  yPhase?: string;
  bPhase?: string;
  ef?: string;
  remarks?: string;
};

export type MeteringProtectionRow = {
  description?: string;
  meteringCore?: string;
  protectionCore?: string;
  rPhase?: string;
  yPhase?: string;
  bPhase?: string;
  ef?: string;
  remarks?: string;
};

export type ConnectionRow = {
  p1Side?: string;
  p2Side?: string;
  primaryInjection?: string;
  ratio?: string;
  d11D71?: string;
  d31D71?: string;
  d51D71?: string;
  c11C71?: string;
  c31C71?: string;
  c51C71?: string;
  remarks?: string;
};

export type ReportPayload = {
  templateCode: string;
  specifications?: Record<string, string | undefined>;
  cores?: CoreRow[];
  checklist?: ChecklistRow[];
  insulation?: InsulationRow[];
  winding?: WindingRow[];
  polarity?: PolarityRow[];
  coreIdentification?: CoreIdentificationRow[];
  ratio?: RatioRow[];
  kneePoint?: KneePointRow[];
  capacitance?: CapacitanceRow[];
  connection?: ConnectionRow;
  series?: SeriesRow[];
  meteringProtection?: MeteringProtectionRow[];
  // Power Transformer (Star-Star) report — all seven sheets.
  powerTr?: PowerTrData;
};

export const DEFAULT_CORES: CoreRow[] = [
  { coreName: "Core 1" },
  { coreName: "Core 2" },
  { coreName: "Core 3" },
  { coreName: "Core 4" },
];

// Template 1: 66 KV CT Testing Report — a flat checklist of 7 tests.
export const TEMPLATE_1_CHECKLIST: string[] = [
  "Visual Inspection",
  "Current Transformer Ratio Test",
  "Winding Resistance Test",
  "Insulation Resistance Test",
  "Polarity Test",
  "KV Point Test",
  "Magnetising Current Test",
];

// Template 2: 66 KV Line CT Testing Report — 14 sections.
export const TEMPLATE_2_SECTIONS: string[] = [
  "CT Specification / Nameplate",
  "Core Details",
  "Capacitance and Tan Delta",
  "Insulation Resistance Test",
  "Secondary Winding Resistance",
  "Polarity Test",
  "Core Identification Test",
  "Ratio Test",
  "KV Point Test",
  "CT Connection",
  "CT Series Test",
  "Metering & Protection Core",
  "Overall Result",
  "Signatures",
];

// Default payload for the 66 KV Line CT report. Mirrors the client's Excel / Google
// Sheet layout: fixed labels and rows are seeded, blank cells are for the technician.
// Pre-filled values are editable defaults from the reference sheet.
export function buildTemplate2DefaultPayload(): ReportPayload {
  const PHASES = ["R", "Y", "B"] as const;
  const ratioSteps = ["15", "30", "45", "60"] as const;

  const ratio = (): RatioRow[] =>
    PHASES.flatMap((phase) =>
      ratioSteps.map((cur) => ({ phase, injectedCurrent: cur, core1: "", core2: "", core3: "", core4: "" }))
    );

  return {
    templateCode: "66KV_LINE_CT",
    specifications: {
      make: "Mehru",
      type: "ONAN",
      insulation: "140 / 350 KV",
      hsv: "72.5 KV",
      ratedSTC: "31.5 KA / 3 Sec",
      nsv: "66 KV",
      crepage: "2250 mm Min.",
      referenceStandards: "IS 16227",
      weight: "220 Kg",
      quantityOfOil: "40 Ltr.",
      ratedFrequency: "50 Hz",
      insulationClass: "A",
      icth: "1440 A",
      waNumber: "C-1319",
      yearOfManufacturing: "2024",
    },
    cores: [
      { coreName: "Core 1", primaryRatio: "600-300", secondaryRatio: "1", ratedBurden: "15", accuracyClass: "0.2s", alfIsf: "< 5" },
      { coreName: "Core 2", primaryRatio: "600-300", secondaryRatio: "1", ratedBurden: "20", accuracyClass: "5P", alfIsf: "20" },
      { coreName: "Core 3", primaryRatio: "600-300", secondaryRatio: "1", accuracyClass: "PX", minimumKPV: "650 V", lexAt6001A: "30mA at Ek/4", rctAt75C: "15 Ω" },
      { coreName: "Core 4", primaryRatio: "600-300", secondaryRatio: "1", accuracyClass: "PX", minimumKPV: "650 V", lexAt6001A: "30mA at Ek/4", rctAt75C: "15 Ω" },
    ],
    capacitance: [
      { particular: "R" },
      { particular: "Y" },
      { particular: "B" },
    ],
    insulation: [
      { testType: "Primary to Earth", meggerUsed: "5 KV", status: "PENDING" },
      { testType: "Primary to Sec.", meggerUsed: "", status: "PENDING" },
      { testType: "Secondary to Earth", meggerUsed: "500 V", status: "PENDING" },
      { testType: "Between Secondary", meggerUsed: "", status: "PENDING" },
    ],
    winding: [
      "1S1-1S2", "1S1-1S3", "2S1-2S2", "2S1-2S3",
      "3S1-3S2", "3S1-3S3", "4S1-4S2", "4S1-4S3",
    ].map((connection) => ({ connection, value: "", rPhase: "", yPhase: "", bPhase: "" })),
    polarity: PHASES.map((phase) => ({ phase, core1: "", core2: "", core3: "", core4: "" })),
    coreIdentification: ["BEFORE_SHORTING", "AFTER_SHORTING"].flatMap((stage) =>
      PHASES.map((phase) => ({ stage, phase, injectedCurrent: "", ratio: "", core1: "", core2: "", core3: "", core4: "" }))
    ),
    ratio: [...ratio(), ...ratio()],
    kneePoint: [
      ["3S1-3S3", "0.25", "162.5"],
      ["3S1-3S3", "0.50", "325"],
      ["3S1-3S3", "0.75", "487.5"],
      ["3S1-3S3", "1.00", "650"],
      ["3S1-3S3", "1.10", "715"],
      ["4S1-4S3", "0.25", "162.5"],
      ["4S1-4S3", "0.50", "325"],
      ["4S1-4S3", "0.75", "487.5"],
      ["4S1-4S3", "1.00", "650"],
      ["4S1-4S3", "1.10", "715"],
    ].map(([core, kvStep, appliedVoltage]) => ({
      core,
      kvStep: `${kvStep} X KVP`,
      appliedVoltage,
      kneePointVoltage: "650",
      lex: "30",
      rPhase: "",
      yPhase: "",
      bPhase: "",
    })),
    connection: {
      p1Side: "66 KV Bus Side",
      p2Side: "66 KV Line Side",
      primaryInjection: "15",
      ratio: "300-600 / 1-1 A",
      d11D71: "",
      d31D71: "",
      d51D71: "",
      c11C71: "",
      c31C71: "",
      c51C71: "",
    },
    series: [
      "R Phase", "Y Phase", "B Phase", "E/F",
    ].map((description) => ({ description, primary: "", secondary: "", aMeter: "", mfm: "", pqmMeter: "", ef: "" })),
    meteringProtection: [
      ["R Phase (D11)", "D11"],
      ["Y Phase (D31)", "D31"],
      ["B Phase (D51)", "D51"],
      ["E/F (D71)", "D71"],
    ].map(([description]) => ({ description, meteringCore: "", protectionCore: "" })),
  };
}