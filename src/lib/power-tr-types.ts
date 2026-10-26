// Power Transformer (Star-Star) Testing Report — payload contract.
//
// Mirrors the client's Excel workbook "POWER TR TESTING REPORT(STAR STAR TR)"
// with seven sheets:
//   1. Ratio Test
//   2. Voltage Ratio Test
//   3. MB Test / Short Ckt Test (Magnetic Balance + Short Circuit)
//   4. Charging Current (Magnetizing Current)
//   5. Winding Resistance
//   6. Vector Group / IR Value / BDV
//   7. Tan Delta
//
// All readings are stored as strings to mirror the Excel sheets and to keep the
// payload simple to persist in the report.data JSON column.

export const POWER_TR_TEMPLATE_CODE = "POWER_TR_STAR_STAR";
export const POWER_TR_TEMPLATE_NAME = "Power TR Testing Report (Star-Star TR)";
export const POWER_TR_REPORT_TITLE = "POWER TR TESTING REPORT (STAR-STAR TR)";

export const POWER_TR_SHEETS = [
  "Ratio Test",
  "Voltage Ratio Test",
  "MB Test / Short Circuit Test",
  "Charging Current",
  "Winding Resistance",
  "Vector Group / IR Value / BDV",
  "Tan Delta",
] as const;

// Tap numbers used across the sheets.
export const POWER_TR_TAPS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;
export const POWER_TR_MB_TAPS = [1, 5, 17] as const;
export const POWER_TR_LV_TAP = 5 as const;

export type PowerTrHeader = {
  mva: string;
  partyName: string;
  substationName: string;
  make: string;
  dateOfTesting: string;
  srNo: string;
  rating: string;
  percentImpedance: string;
  hvAmp: string;
  lvAmp: string;
  vectorGroup: string;
  qtyOfOil: string;
  hvVolts: string;
  lvVolts: string;
  yearOfMfg: string;
};

// Sheet 1 — Ratio Test
export type RatioSheetRow = {
  tap: number;
  hvVoltage: string;
  lvVoltage: string;
  rActualRatio: string;
  rMa: string;
  yActualRatio: string;
  yMa: string;
  bActualRatio: string;
  bMa: string;
};

// Sheet 2 — Voltage Ratio Test
export type VoltageRatioSheetRow = {
  tap: number;
  rHv: string;
  rLv: string;
  yHv: string;
  yLv: string;
  bHv: string;
  bLv: string;
};

// Sheet 3 — Magnetic Balance (HV side)
export type MbHvRow = {
  tap: number;
  voltageApplied: string;
  rn: string;
  yn: string;
  bn: string;
  lvRn: string;
  lvYn: string;
  lvBn: string;
};

// Sheet 3 — Magnetic Balance (LV side)
export type MbLvRow = {
  tap: number;
  voltageApplied: string;
  rn: string;
  yn: string;
  bn: string;
};

// Sheet 3 — Short Circuit Test
export type ShortCircuitRow = {
  tap: number;
  hvR: string;
  hvY: string;
  hvB: string;
  lvR: string;
  lvY: string;
  lvB: string;
  lvN: string;
};

// Sheet 4 — Charging (Magnetizing) Current
export type ChargingRow = {
  tap: number;
  r: string;
  y: string;
  b: string;
};

// Sheet 5 — Winding Resistance
export type WindingResistanceRow = {
  tap: number;
  ry: string;
  yb: string;
  br: string;
};

// Sheet 6 — Vector Group check
export type VectorGroupData = {
  yy: string;
  rn: string;
  bb: string;
  nn: string;
  yb: string;
  rnUpper: string;
};

// Sheet 6 — IR Value
export type IrRow = {
  description: string;
  voltage: string;
  oneMin: string;
  tenMin: string;
};

// Sheet 6 — Megger details
export type MeggerData = {
  make: string;
  srNo: string;
  voltage: string;
};

// Sheet 6 — BDV of oil
export type BdvRow = {
  description: string;
  before: string;
  after: string;
};

// Sheet 7 — Tan Delta header
export type TanDeltaHeader = {
  nameOfSs: string;
  nameOfEquipment: string;
  make: string;
  serialNo: string;
  oti: string;
  humidity: string;
  dateOfTesting: string;
  vectorGroup: string;
  mfgYear: string;
  ambientTemp: string;
  wti: string;
  impedance: string;
};

// Sheet 7 — HV bushing per phase
export type HvBushingPhase = {
  make: string;
  srNo: string;
  cap2kv: string;
  cap10kv: string;
  df2kv: string;
  df10kv: string;
};

export type HvBushing = {
  r: HvBushingPhase;
  y: HvBushingPhase;
  b: HvBushingPhase;
};

// Sheet 7 — Winding tan delta rows
export type WindingTanDeltaRow = {
  nameOfPhase: string;
  testMode: string;
  appliedVoltage1: string;
  cap1: string;
  df1: string;
  appliedVoltage2: string;
  cap2: string;
  df2: string;
};

export type PowerTrSignature = {
  testedBy: string;
  witnessBy: string;
};

export type PowerTrData = {
  templateCode: typeof POWER_TR_TEMPLATE_CODE;
  header: PowerTrHeader;
  ratio: RatioSheetRow[];
  voltageRatio: VoltageRatioSheetRow[];
  mbHv: MbHvRow[];
  mbLv: MbLvRow[];
  shortCircuit: ShortCircuitRow[];
  chargingHv: ChargingRow[];
  chargingLv: ChargingRow[];
  windingHv: WindingResistanceRow[];
  windingLv: WindingResistanceRow[];
  vectorGroup: VectorGroupData;
  ir: IrRow[];
  megger: MeggerData;
  bdv: BdvRow[];
  tanDeltaHeader: TanDeltaHeader;
  hvBushing: HvBushing;
  windingTanDelta: WindingTanDeltaRow[];
  tanDeltaRemarks: string;
  signatures: PowerTrSignature;
};

// ------------------------------------------------------------
// Numeric helpers shared by the form and the PDF.
// ------------------------------------------------------------

export function toNum(value?: string | null): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().replace(/,/g, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function fmt(value: number | null | undefined, dp = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(dp)));
}

export function calcCalRatio(hv?: string, lv?: string): number | null {
  const h = toNum(hv);
  const l = toNum(lv);
  if (h === null || l === null || l === 0) return null;
  return h / l;
}

// Excel: ((Actual - Cal) / Cal) * 100
export function calcRatioError(actual?: string, cal?: number | null): number | null {
  const a = toNum(actual);
  if (a === null || cal === null || cal === undefined || cal === 0) return null;
  return ((a - cal) / cal) * 100;
}

// Excel: Cal ± 0.5 %
export function calcMaxLimit(cal?: number | null): number | null {
  if (cal === null || cal === undefined) return null;
  return cal + (cal * 0.5) / 100;
}

export function calcMinLimit(cal?: number | null): number | null {
  if (cal === null || cal === undefined) return null;
  return cal - (cal * 0.5) / 100;
}

// Excel: PI = 10 minute / 1 minute
export function calcPi(oneMin?: string, tenMin?: string): number | null {
  const one = toNum(oneMin);
  const ten = toNum(tenMin);
  if (one === null || ten === null || one === 0) return null;
  return ten / one;
}

// ------------------------------------------------------------
// Default payload
// ------------------------------------------------------------

export function buildPowerTrDefaultPayload(): PowerTrData {
  const blankRatio: RatioSheetRow = {
    tap: 0,
    hvVoltage: "",
    lvVoltage: "",
    rActualRatio: "",
    rMa: "",
    yActualRatio: "",
    yMa: "",
    bActualRatio: "",
    bMa: "",
  };

  const emptyHvBushing = (): HvBushingPhase => ({
    make: "",
    srNo: "",
    cap2kv: "",
    cap10kv: "",
    df2kv: "",
    df10kv: "",
  });

  return {
    templateCode: POWER_TR_TEMPLATE_CODE,
    header: {
      mva: "",
      partyName: "",
      substationName: "",
      make: "",
      dateOfTesting: "",
      srNo: "",
      rating: "",
      percentImpedance: "",
      hvAmp: "",
      lvAmp: "",
      vectorGroup: "",
      qtyOfOil: "",
      hvVolts: "",
      lvVolts: "",
      yearOfMfg: "",
    },
    ratio: POWER_TR_TAPS.map((tap) => ({ ...blankRatio, tap })),
    voltageRatio: POWER_TR_TAPS.map((tap) => ({
      tap,
      rHv: "",
      rLv: "",
      yHv: "",
      yLv: "",
      bHv: "",
      bLv: "",
    })),
    mbHv: POWER_TR_MB_TAPS.map((tap) => ({
      tap,
      voltageApplied: "",
      rn: "",
      yn: "",
      bn: "",
      lvRn: "",
      lvYn: "",
      lvBn: "",
    })),
    mbLv: [
      { tap: POWER_TR_LV_TAP, voltageApplied: "", rn: "", yn: "", bn: "" },
    ],
    shortCircuit: POWER_TR_TAPS.map((tap) => ({
      tap,
      hvR: "",
      hvY: "",
      hvB: "",
      lvR: "",
      lvY: "",
      lvB: "",
      lvN: "",
    })),
    chargingHv: POWER_TR_TAPS.map((tap) => ({ tap, r: "", y: "", b: "" })),
    chargingLv: [{ tap: POWER_TR_LV_TAP, r: "", y: "", b: "" }],
    windingHv: POWER_TR_TAPS.map((tap) => ({ tap, ry: "", yb: "", br: "" })),
    windingLv: [{ tap: POWER_TR_LV_TAP, ry: "", yb: "", br: "" }],
    vectorGroup: { yy: "", rn: "", bb: "", nn: "", yb: "", rnUpper: "" },
    ir: [
      { description: "HV to E", voltage: "5 KV", oneMin: "", tenMin: "" },
      { description: "LV to E", voltage: "5 KV", oneMin: "", tenMin: "" },
      { description: "HV to LV", voltage: "5 KV", oneMin: "", tenMin: "" },
    ],
    megger: { make: "", srNo: "", voltage: "" },
    bdv: [
      { description: "Top", before: "", after: "" },
      { description: "Bottom", before: "", after: "" },
      { description: "OLTC", before: "", after: "" },
    ],
    tanDeltaHeader: {
      nameOfSs: "",
      nameOfEquipment: "",
      make: "",
      serialNo: "",
      oti: "",
      humidity: "",
      dateOfTesting: "",
      vectorGroup: "",
      mfgYear: "",
      ambientTemp: "",
      wti: "",
      impedance: "",
    },
    hvBushing: { r: emptyHvBushing(), y: emptyHvBushing(), b: emptyHvBushing() },
    windingTanDelta: [
      { nameOfPhase: "HV Winding to LV Winding", testMode: "UST (CHL)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "10kV", cap2: "", df2: "" },
      { nameOfPhase: "HV Winding to Earth", testMode: "GST-G (CH)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "10kV", cap2: "", df2: "" },
      { nameOfPhase: "HV Winding to Earth", testMode: "GST-BG(CHL+CH)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "10kV", cap2: "", df2: "" },
      { nameOfPhase: "LV Winding to HV Winding", testMode: "UST (CLH)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "5kV", cap2: "", df2: "" },
      { nameOfPhase: "LV Winding to Earth", testMode: "GST-G (CL)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "5kV", cap2: "", df2: "" },
      { nameOfPhase: "LV Winding to Earth", testMode: "GST-BG(CLH+CL)", appliedVoltage1: "2kV", cap1: "", df1: "", appliedVoltage2: "5kV", cap2: "", df2: "" },
    ],
    tanDeltaRemarks: "",
    signatures: { testedBy: "", witnessBy: "" },
  };
}

// Ensure a hydrated / legacy payload always has every sheet present so the form
// and PDF never crash on a partial object.
export function normalizePowerTrData(input?: Partial<PowerTrData> | null): PowerTrData {
  const base = buildPowerTrDefaultPayload();
  if (!input) return base;

  const arr = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(value) && value.length ? value : fallback;

  return {
    templateCode: POWER_TR_TEMPLATE_CODE,
    header: { ...base.header, ...(input.header ?? {}) },
    ratio: arr(input.ratio, base.ratio),
    voltageRatio: arr(input.voltageRatio, base.voltageRatio),
    mbHv: arr(input.mbHv, base.mbHv),
    mbLv: arr(input.mbLv, base.mbLv),
    shortCircuit: arr(input.shortCircuit, base.shortCircuit),
    chargingHv: arr(input.chargingHv, base.chargingHv),
    chargingLv: arr(input.chargingLv, base.chargingLv),
    windingHv: arr(input.windingHv, base.windingHv),
    windingLv: arr(input.windingLv, base.windingLv),
    vectorGroup: { ...base.vectorGroup, ...(input.vectorGroup ?? {}) },
    ir: arr(input.ir, base.ir),
    megger: { ...base.megger, ...(input.megger ?? {}) },
    bdv: arr(input.bdv, base.bdv),
    tanDeltaHeader: { ...base.tanDeltaHeader, ...(input.tanDeltaHeader ?? {}) },
    hvBushing: {
      r: { ...base.hvBushing.r, ...(input.hvBushing?.r ?? {}) },
      y: { ...base.hvBushing.y, ...(input.hvBushing?.y ?? {}) },
      b: { ...base.hvBushing.b, ...(input.hvBushing?.b ?? {}) },
    },
    windingTanDelta: arr(input.windingTanDelta, base.windingTanDelta),
    tanDeltaRemarks: input.tanDeltaRemarks ?? "",
    signatures: { ...base.signatures, ...(input.signatures ?? {}) },
  };
}

// ------------------------------------------------------------
// Validation — required fields are the ones a report cannot be issued without.
// Returns a list of human-readable problems (empty list = valid).
// ------------------------------------------------------------

const isBlank = (v?: string) => !v || String(v).trim() === "";

const isNonNumeric = (v?: string) => !isBlank(v) && toNum(v) === null;

export function validatePowerTrData(data: PowerTrData): string[] {
  const errors: string[] = [];

  if (isBlank(data.header.partyName)) errors.push("Ratio Test: Enter the Party Name.");
  if (isBlank(data.header.substationName)) errors.push("Ratio Test: Enter the Name of Sub-Station.");

  const anyRatio = data.ratio.some(
    (r) => !isBlank(r.hvVoltage) || !isBlank(r.lvVoltage) || !isBlank(r.rActualRatio) || !isBlank(r.yActualRatio) || !isBlank(r.bActualRatio)
  );
  if (!anyRatio) errors.push("Ratio Test: Enter at least one tap reading.");

  for (const row of data.ratio) {
    if (isNonNumeric(row.hvVoltage)) errors.push(`Ratio Test tap ${row.tap}: HV Voltage must be a number.`);
    if (isNonNumeric(row.lvVoltage)) errors.push(`Ratio Test tap ${row.tap}: LV Voltage must be a number.`);
    if (isNonNumeric(row.rActualRatio)) errors.push(`Ratio Test tap ${row.tap}: R-Phase Actual Ratio must be a number.`);
    if (isNonNumeric(row.yActualRatio)) errors.push(`Ratio Test tap ${row.tap}: Y-Phase Actual Ratio must be a number.`);
    if (isNonNumeric(row.bActualRatio)) errors.push(`Ratio Test tap ${row.tap}: B-Phase Actual Ratio must be a number.`);
  }

  if (isNonNumeric(data.vectorGroup.yy) || isNonNumeric(data.vectorGroup.rn) ||
      isNonNumeric(data.vectorGroup.bb) || isNonNumeric(data.vectorGroup.nn) ||
      isNonNumeric(data.vectorGroup.yb) || isNonNumeric(data.vectorGroup.rnUpper)) {
    errors.push("Vector Group: readings must be numbers.");
  }

  if (isNonNumeric(data.hvBushing.r.cap2kv) || isNonNumeric(data.hvBushing.r.df2kv) ||
      isNonNumeric(data.hvBushing.y.cap2kv) || isNonNumeric(data.hvBushing.y.df2kv) ||
      isNonNumeric(data.hvBushing.b.cap2kv) || isNonNumeric(data.hvBushing.b.df2kv)) {
    errors.push("Tan Delta: HV bushing capacitance / dissipation values must be numbers.");
  }

  if (isBlank(data.signatures.testedBy)) errors.push("Signatures: Enter the Tested By name.");

  return errors;
}
