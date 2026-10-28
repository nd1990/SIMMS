import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string().min(6),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const companySchema = z.object({
  name: z.string().min(2, "Company name is required"),
  code: z.string().min(2, "Company code is required"),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gstNumber: z.string().optional(),
  status: z.boolean().default(true),
});

export const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  code: z.string().min(2, "Project code is required"),
  companyId: z.string().min(1, "Select a company"),
  epcCompany: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.boolean().default(true),
});

export const siteSchema = z.object({
  name: z.string().min(2, "Site name is required"),
  code: z.string().min(2, "Site code is required"),
  companyId: z.string().min(1, "Select a company"),
  projectId: z.string().optional(),
  address: z.string().optional(),
  switchYardName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  status: z.boolean().default(true),
});

export const employeeSchema = z
  .object({
    name: z.string().min(2, "Employee name is required"),
    code: z.string().min(1, "Employee code is required"),
    email: z.string().email("Enter a valid email"),
    mobileNumber: z.string().optional(),
    role: z.enum(["COMPANY_ADMIN", "SUPERVISOR", "TECHNICIAN"]).default("TECHNICIAN"),
    companyId: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    designationGrade: z.string().optional(),
    stampPath: z.string().optional(),
    status: z.boolean().default(true),
    joiningDate: z.string().optional(),
    createLogin: z.boolean().default(false),
    password: z.string().min(6, "Password must at least 6 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.createLogin && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required to create a login",
      });
    }
  });

export const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["MASTER_ADMIN", "COMPANY_ADMIN", "SUPERVISOR", "TECHNICIAN"]),
  companyId: z.string().optional(),
  employeeId: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});