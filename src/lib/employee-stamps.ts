const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Fallback map for employees whose stamp was added before the upload feature.
const EMPLOYEE_STAMPS: Record<string, string> = {
  "praful vachhani": "/stamps/praful-vachhani.jpeg",
};

export const STAMP_NATURAL_SIZE = { width: 263, height: 216 };

export function withBasePath(path: string | null | undefined): string {
  if (!path) return "";
  if (!BASE || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE || path.startsWith(`${BASE}/`)) return path;
  return `${BASE}${path}`;
}

export function normalizeEmployeeName(name?: string | null): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|shri|smt|miss)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// `stampPath` is the value stored on the Employee record (uploaded stamps).
// When present it wins; otherwise fall back to the static name map.
export function stampForName(name?: string | null, stampPath?: string | null): string | null {
  if (stampPath && stampPath.trim()) return stampPath.trim();
  const key = normalizeEmployeeName(name);
  if (!key) return null;
  return EMPLOYEE_STAMPS[key] ?? null;
}
