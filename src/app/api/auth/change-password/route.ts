import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError } from "@/lib/api";
import { auditLog, getClientIp } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account) return apiError("Account not found", 404);

  const ok = await bcrypt.compare(parsed.data.currentPassword, account.passwordHash);
  if (!ok) return apiError("Current password is incorrect", 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  await auditLog({
    userId: user.id,
    userName: user.name,
    action: "Changed password",
    module: "User",
    recordId: user.id,
    ipAddress: getClientIp(request.headers),
  });

  return Response.json({ ok: true });
}