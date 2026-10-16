import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    let payload;
    try {
      payload = await jwtVerify(parsed.data.token, secret);
    } catch {
      return Response.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const userId = payload.payload.sub;
    if (!userId) {
      return Response.json({ error: "Invalid reset link" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}