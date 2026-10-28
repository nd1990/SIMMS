import type { ReportStatus, TestStatus } from "@prisma/client";

export const TESTING_TYPES = [
  { value: "POWER_TR_STAR_STAR", label: "Power TR Testing Report (Star-Star TR)" },
  { value: "CB_66KV", label: "66 KV CB Testing Report" },
  { value: "MCT_66KV", label: "66 KV MCT Testing Report" },
  { value: "PCT_66KV", label: "66 KV PCT Testing Report" },
];

export const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CORRECTION_REQUESTED: "Correction Requested",
  GENERATED: "Report Generated",
};

export const testStatusLabels: Record<TestStatus, string> = {
  NOT_STARTED: "Not Started",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  PASS: "Pass",
  FAIL: "Fail",
  COMPLETED: "Completed",
};

export const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CORRECTION_REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  GENERATED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ASSIGNED: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

export const RATIO_TEST_CURRENTS = ["15 A", "30 A", "45 A", "60 A"];

export const KNEE_POINT_STEPS = [
  "0.25 × KVP",
  "0.50 × KVP",
  "0.75 × KVP",
  "1.00 × KVP",
  "1.10 × KVP",
];

export const INSULATION_TEST_TYPES = [
  "Primary to Earth",
  "Primary to Secondary",
  "Secondary to Earth",
  "Between Secondary",
];

export const WINDING_CONNECTIONS = [
  "1S1-1S2",
  "1S1-1S3",
  "2S1-2S2",
  "2S1-2S3",
  "3S1-3S2",
  "3S1-3S3",
  "4S1-4S2",
  "4S1-4S3",
];

export const CORES = ["Core 1", "Core 2", "Core 3", "Core 4"];

export const PHASES = ["R", "Y", "B"];
