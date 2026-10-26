import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireApiUser, apiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (!hasPermission(user.role, "employees:manage")) {
    return apiError("Only an admin can upload stamp images", 403);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("No file uploaded", 400);

  const ext = ALLOWED[file.type];
  if (!ext) return apiError("Only PNG, JPEG or WebP images are allowed", 400);
  if (file.size > MAX_BYTES) return apiError("Image must be 2 MB or smaller", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "stamps");
  await mkdir(dir, { recursive: true });

  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, name), buffer);

  return Response.json({ data: { path: `/uploads/stamps/${name}` } });
}
