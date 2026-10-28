import { prisma } from "@/lib/prisma";
import type { ReportPayload, CoreRow, ChecklistRow } from "@/lib/report-types";
import { buildTemplate2DefaultPayload } from "@/lib/report-types";
import { POWER_TR_TEMPLATE_CODE, normalizePowerTrData } from "@/lib/power-tr-types";
import {
  CB_TEMPLATE_CODE,
  MCT_TEMPLATE_CODE,
  MPT_TEMPLATE_CODE,
  PCT_TEMPLATE_CODE,
  PPT_TEMPLATE_CODE,
  normalizeCbData,
  normalizeMctData,
  normalizePctData,
  normalizePtData,
} from "@/lib/equipment-types";
import { withDbRetry } from "@/lib/db-retry";

// Replace-style persistence: the payload is the source of truth and is mirrored
// into the relational tables so reports can be aggregated/queried.

type Row<T> = Partial<T> & Record<string, unknown>;

const SPEC_FIELD_MAP: Record<string, string> = {
  make: "make",
  type: "type",
  "type / model": "type",
  insulation: "insulation",
  hsv: "hsv",
  "rated voltage": "hsv",
  ratedstc: "ratedSTC",
  "rated short time current": "ratedSTC",
  nsv: "nsv",
  "normal system voltage": "nsv",
  crepage: "crepage",
  creepage: "crepage",
  referencestandards: "referenceStandards",
  "reference standards": "referenceStandards",
  weight: "weight",
  quantityofoil: "quantityOfOil",
  "quantity of oil": "quantityOfOil",
  ratedfrequency: "ratedFrequency",
  "rated frequency": "ratedFrequency",
  insulationclass: "insulationClass",
  "insulation class": "insulationClass",
  icth: "icth",
  wanumber: "waNumber",
  "wa number": "waNumber",
  yearofmanufacturing: "yearOfManufacturing",
  "year of manufacturing": "yearOfManufacturing",
};

function upsertSpec(reportId: string, specifications?: Record<string, string | undefined>) {
  if (!specifications) return Promise.resolve();
  const mapped: Record<string, string> = {};
  for (const [label, value] of Object.entries(specifications)) {
    const field = SPEC_FIELD_MAP[label.toLowerCase().trim()];
    if (field && value !== undefined && value !== null && value !== "") mapped[field] = String(value);
  }
  if (Object.keys(mapped).length === 0) return Promise.resolve();
  return prisma.cTSpecification.upsert({
    where: { reportId },
    update: mapped,
    create: { reportId, ...mapped },
  });
}

// Columns Prisma accepts per child table. Anything else coming from an edited or
// legacy payload is dropped instead of blowing up the whole save.
const TABLE_FIELDS: Record<TableKey, readonly string[]> = {
  core: ["coreName", "coreReference", "primaryRatio", "secondaryRatio", "ratedBurden", "accuracyClass", "alfIsf", "minimumKPV", "lexAt6001A", "rctAt75C"],
  checklist: ["testName", "status", "readings", "remarks", "testedBy"],
  insulation: ["testType", "status", "meggerUsed", "rPhase", "yPhase", "bPhase", "remarks"],
  winding: ["connection", "value", "rPhase", "yPhase", "bPhase"],
  polarity: ["phase", "core1", "core2", "core3", "core4", "remarks"],
  coreIdentification: ["stage", "phase", "injectedCurrent", "core1", "core2", "core3", "core4"],
  ratio: ["phase", "injectedCurrent", "measuredSecondary", "core1", "core2", "core3", "core4", "ratio", "remarks"],
  kneePoint: ["kvStep", "kneePointVoltage", "lex", "testCurrent", "core", "appliedVoltage", "rPhase", "yPhase", "bPhase", "remarks"],
  capacitance: ["particular", "srNo", "capacitance", "tanDelta", "remarks"],
  series: ["description", "backupRelay", "aMeter", "mfm", "pqmMeter", "primary", "secondary", "rPhase", "yPhase", "bPhase", "ef", "remarks"],
  meteringProtection: ["description", "meteringCore", "protectionCore", "rPhase", "yPhase", "bPhase", "ef", "remarks"],
};

const CONNECTION_FIELDS = ["p1Side", "p2Side", "primaryInjection", "ratio", "d11D71", "d31D71", "d51D71", "c11C71", "c31C71", "c51C71", "remarks"] as const;

// Non-nullable columns without a Prisma default — always send something.
const TABLE_REQUIRED: Partial<Record<TableKey, readonly string[]>> = {
  core: ["coreName"],
  checklist: ["testName"],
  insulation: ["testType"],
  winding: ["connection"],
  polarity: ["phase"],
  coreIdentification: ["stage", "phase"],
  ratio: ["phase"],
};

const TEST_STATUSES = new Set(["NOT_STARTED", "PENDING", "IN_PROGRESS", "PASS", "FAIL", "COMPLETED"]);

function cleanRow(table: TableKey, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of TABLE_FIELDS[table]) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (key === "status") {
      const status = String(value).toUpperCase();
      if (TEST_STATUSES.has(status)) out.status = status;
      continue;
    }
    if (typeof value === "object") continue;
    out[key] = String(value);
  }
  for (const key of TABLE_REQUIRED[table] ?? []) {
    if (!(key in out)) out[key] = "";
  }
  return out;
}

function cleanConnection(connection: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CONNECTION_FIELDS) {
    const value = connection[key];
    if (value === undefined || value === null || typeof value === "object") continue;
    out[key] = String(value);
  }
  return out;
}

// The Json column must not contain `undefined` — normalise before writing.
function jsonSafe<T>(value: T): T {
  if (Array.isArray(value)) return value.map(jsonSafe) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      out[key] = jsonSafe(item);
    }
    return out as unknown as T;
  }
  return value;
}

type TableKey = "core" | "checklist" | "insulation" | "winding" | "polarity" | "coreIdentification" | "ratio" | "kneePoint" | "capacitance" | "series" | "meteringProtection";

async function replaceList<T>(reportId: string, rows: Row<T>[] | undefined, table: TableKey) {
  if (!rows) return;

  const cleaned = rows.map((r) => cleanRow(table, r as Record<string, unknown>));
  const deleteWhere = { reportId };

  switch (table) {
    case "core":
      await prisma.cTCore.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.cTCore.create({ data: { reportId, ...r } as any })));
      break;
    case "checklist":
      await prisma.testingChecklist.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.testingChecklist.create({ data: { reportId, ...r } as any })));
      break;
    case "insulation":
      await prisma.insulationResistanceTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.insulationResistanceTest.create({ data: { reportId, ...r } as any })));
      break;
    case "winding":
      await prisma.windingResistanceTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.windingResistanceTest.create({ data: { reportId, ...r } as any })));
      break;
    case "polarity":
      await prisma.polarityTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.polarityTest.create({ data: { reportId, ...r } as any })));
      break;
    case "coreIdentification":
      await prisma.coreIdentificationTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.coreIdentificationTest.create({ data: { reportId, ...r } as any })));
      break;
    case "ratio":
      await prisma.ratioTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.ratioTest.create({ data: { reportId, ...r } as any })));
      break;
    case "kneePoint":
      await prisma.kneePointTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.kneePointTest.create({ data: { reportId, ...r } as any })));
      break;
    case "capacitance":
      await prisma.capacitanceTanDelta.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.capacitanceTanDelta.create({ data: { reportId, ...r } as any })));
      break;
    case "series":
      await prisma.cTSeriesTest.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.cTSeriesTest.create({ data: { reportId, ...r } as any })));
      break;
    case "meteringProtection":
      await prisma.meteringProtectionCore.deleteMany({ where: deleteWhere });
      await Promise.all(cleaned.map((r) => prisma.meteringProtectionCore.create({ data: { reportId, ...r } as any })));
      break;
  }
}

async function replaceConnection(reportId: string, connection?: ReportPayload["connection"]) {
  if (!connection) return;
  const cleaned = cleanConnection(connection as Record<string, unknown>);
  if (Object.keys(cleaned).length === 0) return;
  await prisma.cTConnection.upsert({
    where: { reportId },
    update: { ...cleaned },
    create: { reportId, ...(cleaned as any) },
  });
}

export async function persistReportPayload(reportId: string, payload: ReportPayload) {
  const { templateCode, specifications, cores, checklist, insulation, winding, polarity, coreIdentification, ratio, kneePoint, capacitance, connection, series, meteringProtection } = payload;

  // Replace-style writes are idempotent, so retry the whole save on a transient
  // database connection failure instead of surfacing a 500 to the user.
  await withDbRetry(async () => {
    if (templateCode === POWER_TR_TEMPLATE_CODE) {
      // The Power Transformer report keeps every sheet inside the report.data
      // JSON column (no schema change / no CT mirror tables).
      await prisma.testingReport.update({
        where: { id: reportId },
        data: {
          data: jsonSafe({
            templateCode: POWER_TR_TEMPLATE_CODE,
            powerTr: normalizePowerTrData(payload.powerTr),
          }) as unknown as object,
        },
      });
      return;
    }

    if (templateCode === CB_TEMPLATE_CODE) {
      await prisma.testingReport.update({
        where: { id: reportId },
        data: { data: jsonSafe({ templateCode: CB_TEMPLATE_CODE, cb: normalizeCbData(payload.cb) }) as unknown as object },
      });
      return;
    }

    if (templateCode === MCT_TEMPLATE_CODE) {
      await prisma.testingReport.update({
        where: { id: reportId },
        data: { data: jsonSafe({ templateCode: MCT_TEMPLATE_CODE, mct: normalizeMctData(payload.mct) }) as unknown as object },
      });
      return;
    }

    if (templateCode === PCT_TEMPLATE_CODE) {
      await prisma.testingReport.update({
        where: { id: reportId },
        data: { data: jsonSafe({ templateCode: PCT_TEMPLATE_CODE, pct: normalizePctData(payload.pct) }) as unknown as object },
      });
      return;
    }

    if (templateCode === MPT_TEMPLATE_CODE) {
      await prisma.testingReport.update({
        where: { id: reportId },
        data: { data: jsonSafe({ templateCode: MPT_TEMPLATE_CODE, mpt: normalizePtData(payload.mpt, false) }) as unknown as object },
      });
      return;
    }

    if (templateCode === PPT_TEMPLATE_CODE) {
      await prisma.testingReport.update({
        where: { id: reportId },
        data: { data: jsonSafe({ templateCode: PPT_TEMPLATE_CODE, ppt: normalizePtData(payload.ppt, true) }) as unknown as object },
      });
      return;
    }

    if (templateCode === "66KV_CT") {
      await replaceList(reportId, checklist, "checklist");
    } else {
      await Promise.all([
        upsertSpec(reportId, specifications),
        replaceList(reportId, cores, "core"),
        replaceList(reportId, insulation, "insulation"),
        replaceList(reportId, winding, "winding"),
        replaceList(reportId, polarity, "polarity"),
        replaceList(reportId, coreIdentification, "coreIdentification"),
        replaceList(reportId, ratio, "ratio"),
        replaceList(reportId, kneePoint, "kneePoint"),
        replaceList(reportId, capacitance, "capacitance"),
        replaceConnection(reportId, connection),
        replaceList(reportId, series, "series"),
        replaceList(reportId, meteringProtection, "meteringProtection"),
      ]);
    }

    await prisma.testingReport.update({
      where: { id: reportId },
      data: { data: jsonSafe(payload) as unknown as object },
    });
  });
}

type ReportWithRelations = {
  testingChecklist: { id: string; testName: string; readings: string | null; remarks: string | null; status: string; testedBy: string | null }[];
  ctSpecifications?: { [k: string]: string | null } | null;
  ctCores: { id: string; coreName: string; [k: string]: string | null }[];
  capacitanceTanDelta: { [k: string]: string | null }[];
  insulationResistanceTests: { [k: string]: string | null }[];
  windingResistanceTests: { [k: string]: string | null }[];
  polarityTests: { [k: string]: string | null }[];
  coreIdentificationTests: { [k: string]: string | null }[];
  ratioTests: { [k: string]: string | null }[];
  kneePointTests: { [k: string]: string | null }[];
  ctConnection: { [k: string]: string | null } | null;
  ctSeriesTests: { [k: string]: string | null }[];
  meteringProtectionCores: { [k: string]: string | null }[];
  data: unknown;
};

export type HydrationInput = Parameters<typeof hydrateReportPayload>[0];

function pick(row: { [k: string]: unknown } | null | undefined, keys: string[]) {
  if (!row) return {};
  const out: Record<string, string | undefined> = {};
  for (const k of keys) {
    const v = row[k];
    if (v != null) out[k] = String(v);
  }
  return out;
}

export async function hydrateReportPayload(input: ReportWithRelations): Promise<ReportPayload> {
  // Guard against callers that don't include every test-data relation: default
  // any missing collection to an empty array so hydration never crashes.
  const report: ReportWithRelations = {
    ...input,
    testingChecklist: input.testingChecklist ?? [],
    ctSpecifications: input.ctSpecifications ?? null,
    ctCores: input.ctCores ?? [],
    capacitanceTanDelta: input.capacitanceTanDelta ?? [],
    insulationResistanceTests: input.insulationResistanceTests ?? [],
    windingResistanceTests: input.windingResistanceTests ?? [],
    polarityTests: input.polarityTests ?? [],
    coreIdentificationTests: input.coreIdentificationTests ?? [],
    ratioTests: input.ratioTests ?? [],
    kneePointTests: input.kneePointTests ?? [],
    ctConnection: input.ctConnection ?? null,
    ctSeriesTests: input.ctSeriesTests ?? [],
    meteringProtectionCores: input.meteringProtectionCores ?? [],
  };
  const data = (report.data ?? {}) as Partial<ReportPayload>;
  const templateCode = data.templateCode ?? (report.testingChecklist.length ? "66KV_CT" : "66KV_LINE_CT");

  if (templateCode === POWER_TR_TEMPLATE_CODE) {
    return {
      templateCode,
      powerTr: normalizePowerTrData((data as { powerTr?: unknown }).powerTr as never),
    } as ReportPayload;
  }

  if (templateCode === CB_TEMPLATE_CODE) {
    return {
      templateCode,
      cb: normalizeCbData((data as { cb?: unknown }).cb as never),
    } as ReportPayload;
  }

  if (templateCode === MCT_TEMPLATE_CODE) {
    return {
      templateCode,
      mct: normalizeMctData((data as { mct?: unknown }).mct as never),
    } as ReportPayload;
  }

  if (templateCode === PCT_TEMPLATE_CODE) {
    return {
      templateCode,
      pct: normalizePctData((data as { pct?: unknown }).pct as never),
    } as ReportPayload;
  }

  if (templateCode === MPT_TEMPLATE_CODE) {
    return {
      templateCode,
      mpt: normalizePtData((data as { mpt?: unknown }).mpt as never, false),
    } as ReportPayload;
  }

  if (templateCode === PPT_TEMPLATE_CODE) {
    return {
      templateCode,
      ppt: normalizePtData((data as { ppt?: unknown }).ppt as never, true),
    } as ReportPayload;
  }

  const T2 = templateCode === "66KV_LINE_CT" ? buildTemplate2DefaultPayload() : ({} as ReportPayload);

  const specKeys = ["make", "type", "hsv", "ratedSTC", "nsv", "cresPage", "referenceStandards", "weight", "quantityOfOil", "ratedFrequency", "insulationClass", "icth", "waNumber", "yearOfManufacturing", "crepage", "insulation"];
  const coreKeys = ["coreName", "coreReference", "primaryRatio", "secondaryRatio", "ratedBurden", "accuracyClass", "alfIsf", "minimumKPV", "lexAt6001A", "rctAt75C"];
  const threePhase = ["rPhase", "yPhase", "bPhase"];

  return {
    templateCode,
    specifications: report.ctSpecifications ? pick(report.ctSpecifications as any, specKeys) : data.specifications ?? T2.specifications,
    cores: (report.ctCores.length ? report.ctCores.map((c) => pick(c, coreKeys)) : data.cores ?? T2.cores) as CoreRow[] | undefined,
    checklist:
      templateCode === "66KV_CT"
        ? report.testingChecklist.map((c) => ({
            testName: c.testName,
            readings: c.readings ?? undefined,
            remarks: c.remarks ?? undefined,
            status: c.status as ChecklistRow["status"],
            testedBy: c.testedBy ?? undefined,
          }))
        : data.checklist,
    // Template 2 sections
    capacitance: report.capacitanceTanDelta.length ? report.capacitanceTanDelta.map((r) => pick(r, ["particular", "srNo", "capacitance", "tanDelta", "ratio", "remarks"])) : data.capacitance ?? T2.capacitance,
    insulation: report.insulationResistanceTests.length ? report.insulationResistanceTests.map((r) => pick(r, ["testType", "status", "meggerUsed", ...threePhase, "ratio", "remarks"])) : data.insulation ?? T2.insulation,
    winding: report.windingResistanceTests.length ? report.windingResistanceTests.map((r) => pick(r, ["connection", "value", ...threePhase])) : data.winding ?? T2.winding,
    polarity: report.polarityTests.length ? report.polarityTests.map((r) => pick(r, ["phase", "core1", "core2", "core3", "core4", "ratio", "remarks"])) : data.polarity ?? T2.polarity,
    coreIdentification: report.coreIdentificationTests.length
      ? report.coreIdentificationTests.map((r, i) => ({
          ...pick(r, ["stage", "phase", "injectedCurrent", "core1", "core2", "core3", "core4"]),
          ratio: data.coreIdentification?.[i]?.ratio ?? data.coreIdentification?.[0]?.ratio,
        }))
      : data.coreIdentification ?? T2.coreIdentification,
    ratio: report.ratioTests.length ? report.ratioTests.map((r) => pick(r, ["phase", "injectedCurrent", "measuredSecondary", "core1", "core2", "core3", "core4", "ratio", "remarks"])) : data.ratio ?? T2.ratio,
    kneePoint: report.kneePointTests.length ? report.kneePointTests.map((r) => pick(r, ["kvStep", "kneePointVoltage", "lex", "testCurrent", "core", "appliedVoltage", ...threePhase, "ratio", "remarks"])) : data.kneePoint ?? T2.kneePoint,
    connection: report.ctConnection ? pick(report.ctConnection, ["p1Side", "p2Side", "primaryInjection", "ratio", "d11D71", "d31D71", "d51D71", "c11C71", "c31C71", "c51C71", "ratio", "remarks"]) : data.connection ?? T2.connection,
    series: report.ctSeriesTests.length ? report.ctSeriesTests.map((r) => pick(r, ["description", "backupRelay", "aMeter", "mfm", "pqmMeter", "primary", "secondary", ...threePhase, "ef", "ratio", "remarks"])) : data.series ?? T2.series,
    meteringProtection: report.meteringProtectionCores.length ? report.meteringProtectionCores.map((r) => pick(r, ["description", "meteringCore", "protectionCore", ...threePhase, "ef", "ratio", "remarks"])) : data.meteringProtection ?? T2.meteringProtection,
  } as any;
}
