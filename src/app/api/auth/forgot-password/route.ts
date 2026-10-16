import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond OK to avoid account enumeration; only generate when user exists.
    if (!user) {
      return Response.json(
        { ok: true, message: "If an account exists for that email, a reset link was generated." },
        { status: 200 }
      );
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${token}`;

    // In production this link would be emailed. We surface it so the flow works
    // without an SMTP server configured.
    return Response.json(
      {
        ok: true,
        message: "Password reset link generated.",
        resetUrl,
        devNotice: "No email server configured - reset link shown for development.",
      },
      { status: 200 }
    );
  } catch {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}