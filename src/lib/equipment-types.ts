// Equipment test report payload contracts.
//
// Mirrors the client's three Excel workbooks:
//   1. "66 KV CB"  — Circuit Breaker testing report
//   2. "66 KV MCT" — Metering Current Transformer testing report
//   3. "66 KV PCT" — Protection Current Transformer testing report
//
// As with the Power Transformer report, every reading is stored as a string so
// the payload can live in the report.data JSON column without schema changes.

export const CB_TEMPLATE_CODE = "CB_66KV";
export const CB_TEMPLATE_NAME = "66 KV CB Testing Report";
export const CB_REPORT_TITLE = "66 KV CIRCUIT BREAKER TESTING REPORT";

export const MCT_TEMPLATE_CODE = "MCT_66KV";
export const MCT_TEMPLATE_NAME = "66 KV MCT Testing Report";
export const MCT_REPORT_TITLE = "66 KV METERING CT TESTING REPORT";

export const PCT_TEMPLATE_CODE = "PCT_66KV";
export const PCT_TEMPLATE_NAME = "66 KV PCT Testing Report";
export const PCT_REPORT_TITLE = "66 KV PROTECTION CT TESTING REPORT";

export const MPT_TEMPLATE_CODE = "MPT_66KV";
export const MPT_TEMPLATE_NAME = "66 KV MPT Testing Report";
export const MPT_REPORT_TITLE = "66 KV METERING PT TESTING REPORT";

export const PPT_TEMPLATE_CODE = "PPT_66KV";
export const PPT_TEMPLATE_NAME = "66 KV PPT Testing Report";
export const PPT_REPORT_TITLE = "66 KV BUS PT TESTING REPORT";

export const RELAY_TEMPLATE_CODE = "RELAY_66_33KV";
export const RELAY_TEMPLATE_NAME = "66/33 KV Relay Testing Report";
export const RELAY_REPORT_TITLE = "66 KV/33 KV RELAY TESTING REPORT";

export const CB_SHEETS = [
  "Details & Name Plate",
  "IR Values",
  "Operation Checks",
  "Indications",
  "Relay Status",
  "CRM Test",
  "Timing, Coil & Spring Charge",
  "Signatures",
] as const;

export const MCT_SHEETS = [
  "Details & Name Plate",
  "Core Details",
  "Capacitance & Tan Delta",
  "Insulation Resistance",
  "Winding Resistance",
  "Polarity",
  "Ratio Test",
  "Connection & Series Test",
  "Signatures",
] as const;

export const PCT_SHEETS = [
  "Details & Name Plate",
  "Core Details",
  "Capacitance & Tan Delta",
  "Insulation Resistance",
  "Winding Resistance",
  "Polarity",
  "Core Identification",
  "Ratio Test",
  "Knee Point Test",
  "Connection & Series Test",
  "Signatures",
] as const;

export type EquipmentTemplateCode =
  | typeof CB_TEMPLATE_CODE
  | typeof MCT_TEMPLATE_CODE
  | typeof PCT_TEMPLATE_CODE
  | typeof MPT_TEMPLATE_CODE
  | typeof PPT_TEMPLATE_CODE
  | typeof RELAY_TEMPLATE_CODE;

export type EquipmentTemplateMeta = {
  code: EquipmentTemplateCode;
  name: string;
  title: string;
  sheets: readonly string[];
};

export const MPT_SHEETS = [
  "Details & Name Plate",
  "Capacitance & Tan Delta",
  "Insulation Resistance",
  "Polarity",
  "Ratio Test",
  "Signatures",
] as const;

export const PPT_SHEETS = [
  "Details & Name Plate",
  "Capacitance & Tan Delta",
  "Insulation Resistance",
  "Polarity",
  "Ratio Test",
  "Signatures",
] as const;

export const RELAY_SHEETS = ["Relay Details"] as const;

export const EQUIPMENT_TEMPLATES: Record<EquipmentTemplateCode, EquipmentTemplateMeta> = {
  [CB_TEMPLATE_CODE]: { code: CB_TEMPLATE_CODE, name: CB_TEMPLATE_NAME, title: CB_REPORT_TITLE, sheets: CB_SHEETS },
  [MCT_TEMPLATE_CODE]: { code: MCT_TEMPLATE_CODE, name: MCT_TEMPLATE_NAME, title: MCT_REPORT_TITLE, sheets: MCT_SHEETS },
  [PCT_TEMPLATE_CODE]: { code: PCT_TEMPLATE_CODE, name: PCT_TEMPLATE_NAME, title: PCT_REPORT_TITLE, sheets: PCT_SHEETS },
  [MPT_TEMPLATE_CODE]: { code: MPT_TEMPLATE_CODE, name: MPT_TEMPLATE_NAME, title: MPT_REPORT_TITLE, sheets: MPT_SHEETS },
  [PPT_TEMPLATE_CODE]: { code: PPT_TEMPLATE_CODE, name: PPT_TEMPLATE_NAME, title: PPT_REPORT_TITLE, sheets: PPT_SHEETS },
  [RELAY_TEMPLATE_CODE]: { code: RELAY_TEMPLATE_CODE, name: RELAY_TEMPLATE_NAME, title: RELAY_REPORT_TITLE, sheets: RELAY_SHEETS },
};

export function isEquipmentTemplateCode(code: string | undefined | null): code is EquipmentTemplateCode {
  return (
    code === CB_TEMPLATE_CODE ||
    code === MCT_TEMPLATE_CODE ||
    code === PCT_TEMPLATE_CODE ||
    code === MPT_TEMPLATE_CODE ||
    code === PPT_TEMPLATE_CODE ||
    code === RELAY_TEMPLATE_CODE
  );
}

// ------------------------------------------------------------
// Shared shapes
// ------------------------------------------------------------

export type EquipmentHeader = {
  partyName: string;
  switchYard: string;
  projectName: string;
  epcBy: string;
  siteName: string;
  dateOfTesting: string;
  equipmentName: string;
  srNo: string;
};

export type EquipmentSignature = {
  testedBy: string;
  witnessBy: string;
};

export type PhaseRow = {
  phase: string;
  r: string;
  y: string;
  b: string;
};

// ------------------------------------------------------------
// 66 KV CB
// ------------------------------------------------------------

export type CbNamePlate = {
  make: string;
  type: string;
  orderNo: string;
  ratedVoltage: string;
  ratedLightningImpulse: string;
  ratedPowerFrequency: string;
  ratedFrequency: string;
  ratedNormalCurrent: string;
  ratedShortCircuitBreakingCurrent: string;
  ratedDurationShortCircuit: string;
  ratedOutOfPhaseBreakingCurrent: string;
  makingCurrent: string;
  firstPoleToClearFactor: string;
  ratedLineChargingBreakingCurrent: string;
  ratedOperatingSequence: string;
  maxWorkingPressure: string;
  ratedAlarmPressure: string;
  sf6Filling: string;
  blocking: string;
  massOfGas: string;
  massTotal: string;
  dcComponent: string;
  volumePerPole: string;
  closingTime: string;
  openingTime: string;
  standard: string;
  yearOfManufacture: string;
};

export type CbIrRow = {
  phase: string;
  aB: string;
  bC: string;
  aC: string;
};

export type CbOperationRow = {
  operation: string;
  mechanically: string;
  electricalLocal: string;
  electricalRemote: string;
};

export type CbIndicationRow = {
  description: string;
  statusInCrp: string;
};

export type CbRelayRow = {
  relay: string;
  description: string;
  statusInRelay: string;
  ledInRelay: string;
};

export type CbCrmRow = {
  phase: string;
  value1: string;
  value2: string;
  value3: string;
};

export type CbTimingRow = {
  test: string;
  r: string;
  y: string;
  b: string;
};

export type CbCoilRow = {
  location: string;
  resistance: string;
  current: string;
};

export type CbData = {
  templateCode: typeof CB_TEMPLATE_CODE;
  header: EquipmentHeader;
  namePlate: CbNamePlate;
  breakerSrNos: { description: string; srNo: string }[];
  irOff: CbIrRow[];
  irOn: CbIrRow[];
  operations: CbOperationRow[];
  indications: CbIndicationRow[];
  relayStatus: CbRelayRow[];
  crm: CbCrmRow[];
  timing: CbTimingRow[];
  coil: CbCoilRow[];
  springCharge: {
    time: string;
    amp: string;
    acVoltage: string;
    dcVoltage: string;
  };
  remarks: string;
  signatures: EquipmentSignature;
};

export const CB_NAMEPLATE_FIELDS: { key: keyof CbNamePlate; label: string }[] = [
  { key: "make", label: "Make" },
  { key: "type", label: "Type" },
  { key: "orderNo", label: "Order No." },
  { key: "ratedVoltage", label: "Rated Voltage" },
  { key: "ratedLightningImpulse", label: "Rated Lightning Impulse Withstand Voltage" },
  { key: "ratedPowerFrequency", label: "Rated Power Frequency Withstand Voltage" },
  { key: "ratedFrequency", label: "Rated Frequency" },
  { key: "ratedNormalCurrent", label: "Rated Normal Current" },
  { key: "ratedShortCircuitBreakingCurrent", label: "Rated Short Circuit Breaking Current" },
  { key: "ratedDurationShortCircuit", label: "Rated Duration for Short Circuit" },
  { key: "ratedOutOfPhaseBreakingCurrent", label: "Rated Out-of-Phase Breaking Current" },
  { key: "makingCurrent", label: "Making Current" },
  { key: "firstPoleToClearFactor", label: "First-Pole-to-Clear Factor" },
  { key: "ratedLineChargingBreakingCurrent", label: "Rated Line Charging Breaking Current" },
  { key: "ratedOperatingSequence", label: "Rated Operating Sequence" },
  { key: "maxWorkingPressure", label: "Max. Working Pressure" },
  { key: "ratedAlarmPressure", label: "Rated Alarm Pressure of SF6 at +20C" },
  { key: "sf6Filling", label: "SF6 Filling" },
  { key: "blocking", label: "Blocking" },
  { key: "massOfGas", label: "Mass of Gas" },
  { key: "massTotal", label: "Mass Total" },
  { key: "dcComponent", label: "DC-Component" },
  { key: "volumePerPole", label: "Volume per Pole" },
  { key: "closingTime", label: "Closing Time" },
  { key: "openingTime", label: "Opening Time" },
  { key: "standard", label: "Standard" },
  { key: "yearOfManufacture", label: "Year of Manufacture" },
];

export const CB_OPERATIONS = [
  "Spring Charge",
  "Open",
  "Close",
  "Protection Trip",
  "Anti Pumping",
  "Inter Lock",
] as const;

export const CB_INDICATIONS = [
  "CB Spring Charge",
  "CB Open Indication",
  "CB Close Indication",
  "CB Open Semaphore",
  "CB Close Semaphore",
  "CB DC-1 Healthy",
  "CB DC-2 Healthy",
  "CB TCSR-1",
  "CB TCSR-2",
  "SF6 Gas Pressure Normal",
  "CB Lockout",
  "Auto Trip",
  "CB DC Fail",
  "CB AC Fail",
] as const;

export const CB_RELAY_ROWS: { relay: string; description: string }[] = [
  { relay: "OC / EF Relay", description: "CB Open" },
  { relay: "OC / EF Relay", description: "CB Close" },
  { relay: "OC / EF Relay", description: "SF6 Gas Pressure Low" },
  { relay: "OC / EF Relay", description: "CB Lockout" },
  { relay: "Differential Relay", description: "CB Open" },
  { relay: "Differential Relay", description: "CB Close" },
];

export const CB_TIMING_TESTS = ["Close", "Trip-1", "Co-1", "Trip-2", "Co-2"] as const;
export const CB_COIL_LOCATIONS = ["Trip-1", "Trip-2", "Close"] as const;
export const PHASES = ["R", "Y", "B"] as const;

export function buildCbDefaultPayload(): CbData {
  const blankNamePlate = Object.fromEntries(
    CB_NAMEPLATE_FIELDS.map(({ key }) => [key, ""])
  ) as CbNamePlate;

  return {
    templateCode: CB_TEMPLATE_CODE,
    header: {
      partyName: "",
      switchYard: "",
      projectName: "",
      epcBy: "",
      siteName: "",
      dateOfTesting: "",
      equipmentName: "66 KV Line Breaker",
      srNo: "",
    },
    namePlate: blankNamePlate,
    breakerSrNos: [
      { description: "66 KV Line Breaker", srNo: "" },
      { description: "66 KV TR Breaker", srNo: "" },
    ],
    irOff: PHASES.map((phase) => ({ phase, aB: "", bC: "", aC: "" })),
    irOn: PHASES.map((phase) => ({ phase, aB: "", bC: "", aC: "" })),
    operations: CB_OPERATIONS.map((operation) => ({
      operation,
      mechanically: "",
      electricalLocal: "",
      electricalRemote: "",
    })),
    indications: CB_INDICATIONS.map((description) => ({ description, statusInCrp: "" })),
    relayStatus: CB_RELAY_ROWS.map((row) => ({ ...row, statusInRelay: "", ledInRelay: "" })),
    crm: PHASES.map((phase) => ({ phase, value1: "", value2: "", value3: "" })),
    timing: CB_TIMING_TESTS.map((test) => ({ test, r: "", y: "", b: "" })),
    coil: CB_COIL_LOCATIONS.map((location) => ({ location, resistance: "", current: "" })),
    springCharge: { time: "", amp: "", acVoltage: "", dcVoltage: "" },
    remarks: "",
    signatures: { testedBy: "", witnessBy: "" },
  };
}

export function normalizeCbData(input?: Partial<CbData> | null): CbData {
  const base = buildCbDefaultPayload();
  if (!input) return base;

  const arr = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(value) && value.length ? value : fallback;

  return {
    templateCode: CB_TEMPLATE_CODE,
    header: { ...base.header, ...(input.header ?? {}) },
    namePlate: { ...base.namePlate, ...(input.namePlate ?? {}) },
    breakerSrNos: arr(input.breakerSrNos, base.breakerSrNos),
    irOff: arr(input.irOff, base.irOff),
    irOn: arr(input.irOn, base.irOn),
    operations: arr(input.operations, base.operations),
    indications: arr(input.indications, base.indications),
    relayStatus: arr(input.relayStatus, base.relayStatus),
    crm: arr(input.crm, base.crm),
    timing: arr(input.timing, base.timing),
    coil: arr(input.coil, base.coil),
    springCharge: { ...base.springCharge, ...(input.springCharge ?? {}) },
    remarks: input.remarks ?? "",
    signatures: { ...base.signatures, ...(input.signatures ?? {}) },
  };
}

// ------------------------------------------------------------
// 66 KV MCT
// ------------------------------------------------------------

export type MctNamePlate = {
  make: string;
  hsv: string;
  insulation: string;
  nsv: string;
  weight: string;
  madeToIS: string;
  stc: string;
  creepageDistance: string;
  ratedFrequency: string;
  insulationClass: string;
  yearOfManufacture: string;
  oilQuantity: string;
  type: string;
};

export type MctCore = {
  coreReference: string;
  primaryRatio: string;
  secondaryRatio: string;
  ratedBurden: string;
  accuracyClass: string;
  alfIsf: string;
  turnRatio: string;
  minimumKPV: string;
  lex: string;
  rctAt75C: string;
};

export type MctRatingRow = {
  particular: string;
  r: string;
  y: string;
  b: string;
};

export type MctIrRow = {
  testType: string;
  meggerUsed: string;
  r: string;
  y: string;
  b: string;
};

export type MctWindingRow = {
  connection: string;
  r: string;
  y: string;
  b: string;
};

export type MctPolarityRow = {
  phase: string;
  core1: string;
};

export type MctRatioRow = {
  phase: string;
  injectedCurrent: string;
  measured: string;
};

export type MctData = {
  templateCode: typeof MCT_TEMPLATE_CODE;
  header: EquipmentHeader;
  namePlate: MctNamePlate;
  core: MctCore;
  ratings: MctRatingRow[];
  ir: MctIrRow[];
  winding: MctWindingRow[];
  polarity: MctPolarityRow[];
  ratio: MctRatioRow[];
  connection: {
    p1Side: string;
    p2Side: string;
  };
  series: {
    injectedPrimary: string;
    ratio: string;
    r: string;
    y: string;
    b: string;
  };
  remarks: string;
  signatures: EquipmentSignature;
};

export const MCT_NAMEPLATE_FIELDS: { key: keyof MctNamePlate; label: string }[] = [
  { key: "make", label: "Make" },
  { key: "type", label: "Type" },
  { key: "hsv", label: "HSV" },
  { key: "insulation", label: "Insulation" },
  { key: "nsv", label: "NSV" },
  { key: "weight", label: "Weight" },
  { key: "madeToIS", label: "Made to IS" },
  { key: "stc", label: "STC" },
  { key: "creepageDistance", label: "Creepage Distance" },
  { key: "ratedFrequency", label: "Rated Frequency" },
  { key: "insulationClass", label: "Insulation Class" },
  { key: "yearOfManufacture", label: "Year of Mfg." },
  { key: "oilQuantity", label: "Oil Qty." },
];

export const MCT_CORE_FIELDS: { key: keyof MctCore; label: string }[] = [
  { key: "coreReference", label: "Core Ref." },
  { key: "primaryRatio", label: "Ratio (Primary)" },
  { key: "secondaryRatio", label: "Ratio (Secondary)" },
  { key: "ratedBurden", label: "Rated Burden (VA)" },
  { key: "accuracyClass", label: "Accuracy Class" },
  { key: "alfIsf", label: "ALF / ISF" },
  { key: "turnRatio", label: "Turn Ratio" },
  { key: "minimumKPV", label: "Min. KPV" },
  { key: "lex", label: "Lex" },
  { key: "rctAt75C", label: "Rct at 75°C" },
];

export const CT_RATING_ROWS = ["Sr. No.", "Capacitance", "Tan Delta"] as const;
export const MCT_IR_TESTS = ["Primary to Earth", "Primary to Sec.", "Secondary to Earth"] as const;
export const PCT_IR_TESTS = ["Primary to Earth", "Primary to Sec.", "Secondary to Earth", "Between Secondary"] as const;
export const PCT_WINDING_CONNECTIONS = [
  "1S1-1S2",
  "1S1-1S3",
  "2S1-2S2",
  "2S1-2S3",
  "3S1-3S2",
  "3S1-3S3",
  "4S1-4S2",
  "4S1-4S3",
] as const;

export function buildMctDefaultPayload(): MctData {
  return {
    templateCode: MCT_TEMPLATE_CODE,
    header: {
      partyName: "",
      switchYard: "",
      projectName: "",
      epcBy: "",
      siteName: "",
      dateOfTesting: "",
      equipmentName: "66 KV Line MCT",
      srNo: "",
    },
    namePlate: Object.fromEntries(MCT_NAMEPLATE_FIELDS.map(({ key }) => [key, ""])) as MctNamePlate,
    core: Object.fromEntries(MCT_CORE_FIELDS.map(({ key }) => [key, ""])) as MctCore,
    ratings: CT_RATING_ROWS.map((particular) => ({ particular, r: "", y: "", b: "" })),
    ir: MCT_IR_TESTS.map((testType, i) => ({
      testType,
      meggerUsed: i === 2 ? "500 V" : "5 KV",
      r: "",
      y: "",
      b: "",
    })),
    winding: [{ connection: "1S1-1S2", r: "", y: "", b: "" }],
    polarity: PHASES.map((phase) => ({ phase, core1: "" })),
    ratio: PHASES.flatMap((phase) =>
      ["20", "40", "60"].map((injectedCurrent) => ({ phase, injectedCurrent, measured: "" }))
    ),
    connection: { p1Side: "66 KV Line Side", p2Side: "66 KV Bus Side" },
    series: { injectedPrimary: "", ratio: "", r: "", y: "", b: "" },
    remarks: "",
    signatures: { testedBy: "", witnessBy: "" },
  };
}

export function normalizeMctData(input?: Partial<MctData> | null): MctData {
  const base = buildMctDefaultPayload();
  if (!input) return base;

  const arr = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(value) && value.length ? value : fallback;

  return {
    templateCode: MCT_TEMPLATE_CODE,
    header: { ...base.header, ...(input.header ?? {}) },
    namePlate: { ...base.namePlate, ...(input.namePlate ?? {}) },
    core: { ...base.core, ...(input.core ?? {}) },
    ratings: arr(input.ratings, base.ratings),
    ir: arr(input.ir, base.ir),
    winding: arr(input.winding, base.winding),
    polarity: arr(input.polarity, base.polarity),
    ratio: arr(input.ratio, base.ratio),
    connection: { ...base.connection, ...(input.connection ?? {}) },
    series: { ...base.series, ...(input.series ?? {}) },
    remarks: input.remarks ?? "",
    signatures: { ...base.signatures, ...(input.signatures ?? {}) },
  };
}

// ------------------------------------------------------------
// 66 KV PCT
// ------------------------------------------------------------

export type PctNamePlate = {
  make: string;
  type: string;
  insulation: string;
  hsv: string;
  ratedSTC: string;
  nsv: string;
  crepage: string;
  referenceStandards: string;
  weight: string;
  quantityOfOil: string;
  ratedFrequency: string;
  insulationClass: string;
  icth: string;
  waNumber: string;
  yearOfManufacturing: string;
};

export type PctCore = {
  coreName: string;
  primaryRatio: string;
  secondaryRatio: string;
  ratedBurden: string;
  accuracyClass: string;
  alfIsf: string;
  minimumKPV: string;
  lexAt6001A: string;
  rctAt75C: string;
};

export type PctPolarityRow = {
  phase: string;
  core1: string;
  core2: string;
  core3: string;
  core4: string;
};

export type PctCoreIdRow = {
  stage: string;
  phase: string;
  core1: string;
  core2: string;
  core3: string;
  core4: string;
};

export type PctRatioRow = {
  phase: string;
  injectedCurrent: string;
  core1_600: string;
  core1_300: string;
  core2_600: string;
  core2_300: string;
  core3_600: string;
  core3_300: string;
  core4_600: string;
  core4_300: string;
};

export type PctKneePointRow = {
  core: string;
  step: string;
  appliedVoltage: string;
  r: string;
  y: string;
  b: string;
};

export type PctConnection = {
  p1Side: string;
  p2Side: string;
  primaryInjected: string;
  ratio: string;
  d11D71: string;
  d31D71: string;
  d51D71: string;
  c11C71: string;
  c31C71: string;
  c51C71: string;
  a11A71: string;
  a31A71: string;
  a51A71: string;
};

export type PctSeriesRow = {
  description: string;
  backupPrimary: string;
  backupSecondary: string;
  diffPrimary: string;
  diffSecondary: string;
};

export type PctMeteringRow = {
  description: string;
  meteringCore: string;
  protectionCore: string;
  diffCore: string;
};

export type PctMeterRow = {
  description: string;
  mfm1: string;
  mfm2: string;
  aMeter: string;
};

export type PctData = {
  templateCode: typeof PCT_TEMPLATE_CODE;
  header: EquipmentHeader;
  namePlate: PctNamePlate;
  cores: PctCore[];
  ratings: MctRatingRow[];
  ir: MctIrRow[];
  winding: MctWindingRow[];
  polarity: PctPolarityRow[];
  coreIdentification: PctCoreIdRow[];
  coreIdInjected: string;
  coreIdRatio: string;
  ratio: PctRatioRow[];
  kneePoint: PctKneePointRow[];
  connection: PctConnection;
  series: PctSeriesRow[];
  meteringProtection: PctMeteringRow[];
  meterReadings: PctMeterRow[];
  remarks: string;
  signatures: EquipmentSignature;
};

export const PCT_NAMEPLATE_FIELDS: { key: keyof PctNamePlate; label: string }[] = [
  { key: "make", label: "Make" },
  { key: "type", label: "Type" },
  { key: "insulation", label: "Insulation" },
  { key: "hsv", label: "HSV" },
  { key: "ratedSTC", label: "Rated STC" },
  { key: "nsv", label: "NSV" },
  { key: "crepage", label: "Creepage" },
  { key: "referenceStandards", label: "Ref. Standards" },
  { key: "weight", label: "Weight of CT" },
  { key: "quantityOfOil", label: "Qty. of Oil" },
  { key: "ratedFrequency", label: "Rated Freq." },
  { key: "insulationClass", label: "Insulation Class" },
  { key: "icth", label: "Icth" },
  { key: "waNumber", label: "WA No." },
  { key: "yearOfManufacturing", label: "Year of Mfg." },
];

export const PCT_CORE_FIELDS: { key: keyof Omit<PctCore, "coreName">; label: string }[] = [
  { key: "primaryRatio", label: "Ratio (Primary)" },
  { key: "secondaryRatio", label: "Ratio (Secondary)" },
  { key: "ratedBurden", label: "Rated Burden (VA)" },
  { key: "accuracyClass", label: "Accuracy Class" },
  { key: "alfIsf", label: "ALF / ISF" },
  { key: "minimumKPV", label: "Min. KPV" },
  { key: "lexAt6001A", label: "Lex @600/1A" },
  { key: "rctAt75C", label: "Rct at 75°C" },
];

export const PCT_KNEE_POINT_STEPS = ["0.25 X KVP", "0.50 X KVP", "0.75 X KVP", "1.00 X KVP", "1.10 X KVP"] as const;
export const PCT_KNEE_APPLIED = ["162.5", "325", "487.5", "650", "715"] as const;
export const PCT_KNEE_CORES = ["3S1-3S3 (Core 3)", "4S1-4S3 (Core 4)"] as const;

export function buildPctDefaultPayload(): PctData {
  return {
    templateCode: PCT_TEMPLATE_CODE,
    header: {
      partyName: "",
      switchYard: "",
      projectName: "",
      epcBy: "",
      siteName: "",
      dateOfTesting: "",
      equipmentName: "66 KV Line PCT",
      srNo: "",
    },
    namePlate: Object.fromEntries(PCT_NAMEPLATE_FIELDS.map(({ key }) => [key, ""])) as PctNamePlate,
    cores: [1, 2, 3, 4].map((n) => ({
      coreName: `Core ${n}`,
      primaryRatio: "",
      secondaryRatio: "",
      ratedBurden: "",
      accuracyClass: "",
      alfIsf: "",
      minimumKPV: "",
      lexAt6001A: "",
      rctAt75C: "",
    })),
    ratings: CT_RATING_ROWS.map((particular) => ({ particular, r: "", y: "", b: "" })),
    ir: PCT_IR_TESTS.map((testType, i) => ({
      testType,
      meggerUsed: i <= 1 ? "5 KV" : "500 V",
      r: "",
      y: "",
      b: "",
    })),
    winding: PCT_WINDING_CONNECTIONS.map((connection) => ({ connection, r: "", y: "", b: "" })),
    polarity: PHASES.map((phase) => ({ phase, core1: "", core2: "", core3: "", core4: "" })),
    coreIdentification: ["Before shorting CT sec terminals", "After shorting CT sec terminals"].flatMap((stage) =>
      PHASES.map((phase) => ({ stage, phase, core1: "", core2: "", core3: "", core4: "" }))
    ),
    coreIdInjected: "",
    coreIdRatio: "",
    ratio: PHASES.flatMap((phase) =>
      ["15", "30", "45", "60"].map((injectedCurrent) => ({
        phase,
        injectedCurrent,
        core1_600: "",
        core1_300: "",
        core2_600: "",
        core2_300: "",
        core3_600: "",
        core3_300: "",
        core4_600: "",
        core4_300: "",
      }))
    ),
    kneePoint: PCT_KNEE_CORES.flatMap((core) =>
      PCT_KNEE_POINT_STEPS.map((step, i) => ({
        core,
        step,
        appliedVoltage: PCT_KNEE_APPLIED[i],
        r: "",
        y: "",
        b: "",
      }))
    ),
    connection: {
      p1Side: "66 KV Bus Side",
      p2Side: "66 KV Line Side",
      primaryInjected: "",
      ratio: "",
      d11D71: "",
      d31D71: "",
      d51D71: "",
      c11C71: "",
      c31C71: "",
      c51C71: "",
      a11A71: "",
      a31A71: "",
      a51A71: "",
    },
    series: ["R Phase", "Y Phase", "B Phase", "E/F"].map((description) => ({
      description,
      backupPrimary: "",
      backupSecondary: "",
      diffPrimary: "",
      diffSecondary: "",
    })),
    meteringProtection: ["R Phase", "Y Phase", "B Phase"].map((description) => ({
      description,
      meteringCore: "",
      protectionCore: "",
      diffCore: "",
    })),
    meterReadings: ["R Phase", "Y Phase", "B Phase"].map((description) => ({
      description,
      mfm1: "",
      mfm2: "",
      aMeter: "",
    })),
    remarks: "",
    signatures: { testedBy: "", witnessBy: "" },
  };
}

export function normalizePctData(input?: Partial<PctData> | null): PctData {
  const base = buildPctDefaultPayload();
  if (!input) return base;

  const arr = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(value) && value.length ? value : fallback;

  return {
    templateCode: PCT_TEMPLATE_CODE,
    header: { ...base.header, ...(input.header ?? {}) },
    namePlate: { ...base.namePlate, ...(input.namePlate ?? {}) },
    cores: arr(input.cores, base.cores),
    ratings: arr(input.ratings, base.ratings),
    ir: arr(input.ir, base.ir),
    winding: arr(input.winding, base.winding),
    polarity: arr(input.polarity, base.polarity),
    coreIdentification: arr(input.coreIdentification, base.coreIdentification),
    coreIdInjected: input.coreIdInjected ?? "",
    coreIdRatio: input.coreIdRatio ?? "",
    ratio: arr(input.ratio, base.ratio),
    kneePoint: arr(input.kneePoint, base.kneePoint),
    connection: { ...base.connection, ...(input.connection ?? {}) },
    series: arr(input.series, base.series),
    meteringProtection: arr(input.meteringProtection, base.meteringProtection),
    meterReadings: arr(input.meterReadings, base.meterReadings),
    remarks: input.remarks ?? "",
    signatures: { ...base.signatures, ...(input.signatures ?? {}) },
  };
}

// ------------------------------------------------------------
// Numeric helpers
// ------------------------------------------------------------

export function toNum(value?: string | null): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().replace(/,/g, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function fmt(value: number | null | undefined, dp = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(dp)));
}

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------

const isBlank = (v?: string) => !v || String(v).trim() === "";

export function validateCbData(data: CbData): string[] {
  const errors: string[] = [];
  if (isBlank(data.header.equipmentName)) errors.push("Details: Enter the equipment / breaker name.");
  if (isBlank(data.signatures.testedBy)) errors.push("Signatures: Enter the Tested By name.");

  const anyIr = [...data.irOff, ...data.irOn].some(
    (r) => !isBlank(r.aB) || !isBlank(r.bC) || !isBlank(r.aC)
  );
  const anyCrm = data.crm.some((r) => !isBlank(r.value1) || !isBlank(r.value2) || !isBlank(r.value3));
  const anyTiming = data.timing.some((r) => !isBlank(r.r) || !isBlank(r.y) || !isBlank(r.b));

  if (!anyIr && !anyCrm && !anyTiming) {
    errors.push("Tests: Enter at least one IR, CRM or timing reading.");
  }
  return errors;
}

export function validateMctData(data: MctData): string[] {
  const errors: string[] = [];
  if (isBlank(data.header.equipmentName)) errors.push("Details: Enter the equipment / MCT name.");
  if (isBlank(data.signatures.testedBy)) errors.push("Signatures: Enter the Tested By name.");

  if (!data.ratio.some((r) => !isBlank(r.measured))) {
    errors.push("Ratio Test: Enter at least one measured secondary current.");
  }
  return errors;
}

export function validatePctData(data: PctData): string[] {
  const errors: string[] = [];
  if (isBlank(data.header.equipmentName)) errors.push("Details: Enter the equipment / PCT name.");
  if (isBlank(data.signatures.testedBy)) errors.push("Signatures: Enter the Tested By name.");

  const anyRatio = data.ratio.some((r) =>
    [r.core1_600, r.core1_300, r.core2_600, r.core2_300, r.core3_600, r.core3_300, r.core4_600, r.core4_300].some(
      (v) => !isBlank(v)
    )
  );
  if (!anyRatio) errors.push("Ratio Test: Enter at least one measured secondary current.");
  return errors;
}

export type PtNamePlate = {
  make: string;
  type: string;
  phase: string;
  voltageFactor: string;
  bil: string;
  hsv: string;
  insulationClass: string;
  yearOfManufacture: string;
  oil: string;
  creepage: string;
  refStd: string;
  ratedFrequency: string;
  weight: string;
  typeEarthed: string;
};

export type PtCore = {
  coreReference: string;
  primaryRatio: string;
  secondaryRatio: string;
  ratedBurden: string;
  accuracyClass: string;
  terminal: string;
};

export type PtTanDeltaRow = {
  particular: string;
  r: string;
  y: string;
  b: string;
};

export type PtIrRow = {
  status: string;
  meggerUsed: string;
  r: string;
  y: string;
  b: string;
};

export type PtPolarityRow = {
  phase: string;
  core1: string;
  core2: string;
};

export type PtRatioApplied = {
  ry: string;
  yb: string;
  br: string;
  rn: string;
  yn: string;
  bn: string;
};

export type PtRatioMeasured = {
  coreName: string;
  r1n: string;
  r1y1: string;
  y1n: string;
  y1b1: string;
  b1n: string;
  b1r1: string;
};

export type PtData = {
  templateCode: typeof MPT_TEMPLATE_CODE | typeof PPT_TEMPLATE_CODE;
  header: EquipmentHeader;
  namePlate: PtNamePlate;
  cores: PtCore[];
  tanDelta: PtTanDeltaRow[];
  ir: PtIrRow[];
  polarity: PtPolarityRow[];
  ratioApplied: PtRatioApplied;
  ratioMeasured: PtRatioMeasured[];
  connection: string;
  remarks: string;
  signatures: EquipmentSignature;
};

export const PT_NAMEPLATE_FIELDS: { key: keyof PtNamePlate; label: string }[] = [
  { key: "make", label: "Make" },
  { key: "type", label: "Type" },
  { key: "phase", label: "Phase" },
  { key: "voltageFactor", label: "Voltage Factor" },
  { key: "bil", label: "BIL" },
  { key: "hsv", label: "H.S.V" },
  { key: "insulationClass", label: "Insu.Cl" },
  { key: "yearOfManufacture", label: "Year of Mfg." },
  { key: "oil", label: "Oil" },
  { key: "creepage", label: "Creepage" },
  { key: "refStd", label: "REF STD" },
  { key: "ratedFrequency", label: "Rated Freq." },
  { key: "weight", label: "Weight" },
  { key: "typeEarthed", label: "Type" },
];

export function buildPtDefaultPayload(isBus: boolean): PtData {
  const cores = isBus
    ? [
        {
          coreReference: "Core - 1",
          primaryRatio: "66KV/√3",
          secondaryRatio: "110V/√3",
          ratedBurden: "50",
          accuracyClass: "0.2",
          terminal: "1a-1n",
        },
        {
          coreReference: "Core - 2",
          primaryRatio: "66KV/√3",
          secondaryRatio: "110V/√3",
          ratedBurden: "100",
          accuracyClass: "3P",
          terminal: "2a-2n",
        },
      ]
    : [
        {
          coreReference: "Core - 1",
          primaryRatio: "66KV/√3",
          secondaryRatio: "110V/√3",
          ratedBurden: "10",
          accuracyClass: "0.2",
          terminal: "1a-1n",
        },
      ];

  return {
    templateCode: isBus ? PPT_TEMPLATE_CODE : MPT_TEMPLATE_CODE,
    header: {
      partyName: "",
      switchYard: "",
      projectName: "",
      epcBy: "",
      siteName: "",
      dateOfTesting: "",
      equipmentName: isBus ? "66 KV Bus PT" : "66 KV Line MPT",
      srNo: "",
    },
    namePlate: {
      make: "Mehru",
      type: "Outdoor Oil Cooled",
      phase: "Single",
      voltageFactor: "1.2 Times Cont. & 1.5 Times for 30 Sec.",
      bil: "140/350 KV",
      hsv: "72.5 KV",
      insulationClass: "A",
      yearOfManufacture: "2025",
      oil: "40 Ltr Approx",
      creepage: "2250 mm Min.",
      refStd: "IS 16227",
      ratedFrequency: "50 Hz",
      weight: "250 Kg",
      typeEarthed: "Earthed",
    },
    cores,
    tanDelta: [
      { particular: "Sr. No.", r: "", y: "", b: "" },
      { particular: "Capacitance", r: "", y: "", b: "" },
      { particular: "Ten Delta", r: "", y: "", b: "" },
    ],
    ir: [
      { status: "Primary to Earth", meggerUsed: "5 KV", r: "", y: "", b: "" },
      { status: "Primary to Secondary", meggerUsed: "", r: "", y: "", b: "" },
      { status: "Secondary to Earth", meggerUsed: "500 V", r: "", y: "", b: "" },
      { status: "Between Secondary", meggerUsed: "", r: "", y: "", b: "" },
    ],
    polarity: isBus
      ? [
          { phase: "R", core1: "Forward", core2: "Forward" },
          { phase: "Y", core1: "Forward", core2: "Forward" },
          { phase: "B", core1: "Forward", core2: "Forward" },
        ]
      : [
          { phase: "R", core1: "Forward", core2: "" },
          { phase: "Y", core1: "Forward", core2: "" },
          { phase: "B", core1: "Forward", core2: "" },
        ],
    ratioApplied: { ry: "", yb: "", br: "", rn: "", yn: "", bn: "" },
    ratioMeasured: cores.map((c) => ({
      coreName: c.coreReference,
      r1n: "",
      r1y1: "",
      y1n: "",
      y1b1: "",
      b1n: "",
      b1r1: "",
    })),
    connection: "",
    remarks: "Polarity Check & Found O. K.",
    signatures: { testedBy: "", witnessBy: "" },
  };
}

export function normalizePtData(input?: Partial<PtData> | null, isBus = false): PtData {
  const base = buildPtDefaultPayload(isBus);
  if (!input) return base;
  const arr = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(value) && value.length ? value : fallback;
  return {
    templateCode: input.templateCode ?? base.templateCode,
    header: { ...base.header, ...(input.header ?? {}) },
    namePlate: { ...base.namePlate, ...(input.namePlate ?? {}) },
    cores: arr(input.cores, base.cores),
    tanDelta: arr(input.tanDelta, base.tanDelta),
    ir: arr(input.ir, base.ir),
    polarity: arr(input.polarity, base.polarity),
    ratioApplied: { ...base.ratioApplied, ...(input.ratioApplied ?? {}) },
    ratioMeasured: arr(input.ratioMeasured, base.ratioMeasured),
    connection: input.connection ?? "",
    remarks: input.remarks ?? base.remarks,
    signatures: { ...base.signatures, ...(input.signatures ?? {}) },
  };
}
