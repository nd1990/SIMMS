export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBase(path: string): string {
  if (!BASE) return path;
  if (path.startsWith(BASE + "/") || path === BASE) return path;
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${BASE}${path}`;
}
