import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string | null;
      employeeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    companyId?: string | null;
    employeeId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    companyId?: string | null;
    employeeId?: string | null;
  }
}
