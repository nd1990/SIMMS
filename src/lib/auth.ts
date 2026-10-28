import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withBase } from "@/lib/base-path";

// How often a logged-in session re-reads the user row (name, role, company…).
const SESSION_REFRESH_MS = 30_000;

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: withBase("/login"),
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) return null;

        if (user.status !== "ACTIVE") return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          companyId: user.companyId ?? null,
          employeeId: user.employeeId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: Role }).role;
        token.companyId = (user as { companyId?: string | null }).companyId;
        token.employeeId = (user as { employeeId?: string | null }).employeeId;
        token.uid = user.id;
        token.name = user.name;
        token.email = user.email;
        token.refreshedAt = Date.now();
        return token;
      }

      // Keep name / role / company in sync with the database so admin edits to
      // an employee show up without forcing the user to sign out.
      const last = (token.refreshedAt as number | undefined) ?? 0;
      if (token.uid && Date.now() - last > SESSION_REFRESH_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            companyId: true,
            employeeId: true,
            status: true,
          },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role as Role;
          token.companyId = dbUser.companyId ?? null;
          token.employeeId = dbUser.employeeId ?? null;
          token.disabled = dbUser.status !== "ACTIVE";
        }
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.role = (token.role as Role) ?? "TECHNICIAN";
        session.user.companyId = (token.companyId as string) ?? null;
        session.user.employeeId = (token.employeeId as string) ?? null;
      }
      return session;
    },
  },
} as NextAuthOptions;

export const auth = authOptions;
