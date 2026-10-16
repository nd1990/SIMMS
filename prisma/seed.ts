import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(
  data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    companyId?: string | null;
    employeeId?: string | null;
    status?: UserStatus;
  }
) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name, role: data.role, passwordHash, status: "ACTIVE" },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      status: data.status ?? "ACTIVE",
      companyId: data.companyId ?? null,
      employeeId: data.employeeId ?? null,
    },
  });
}

async function main() {
  // ---- Master Admin ----
  await upsertUser({
    name: "System Administrator",
    email: "admin@cttesting.com",
    password: "Admin@123",
    role: "MASTER_ADMIN",
  });
  console.log("✔ Master Admin created: admin@cttesting.com / Admin@123");

  // ---- Sample Company ----
  const company = await prisma.company.upsert({
    where: { code: "TRANSCO" },
    update: {},
    create: {
      name: "Transmission Corporation Ltd",
      code: "TRANSCO",
      address: "Power House Road, Industrial Area",
      contactPerson: "Rajesh Kumar",
      contactNumber: "+91 98765 43210",
      email: "contact@transco.example",
      gstNumber: "27AABCT1234F1Z5",
    },
  });
  console.log("✔ Sample company created");

  // ---- Sample Project ----
  const project = await prisma.project.upsert({
    where: { code: "PRJ-2026-001" },
    update: { companyId: company.id },
    create: {
      name: "Substation Expansion 220/132kV",
      code: "PRJ-2026-001",
      companyId: company.id,
      epcCompany: "EPC Power Solutions",
      location: "Sector 12, Industrial Estate",
      description: "Expansion of main substation with new CT bays",
    },
  });
  console.log("✔ Sample project created");

  // ---- Sample Site ----
  const site = await prisma.site.upsert({
    where: { code: "SITE-NS-01" },
    update: { companyId: company.id, projectId: project.id },
    create: {
      name: "Northern Substation",
      code: "SITE-NS-01",
      companyId: company.id,
      projectId: project.id,
      address: "NH-44, Industrial Estate",
      switchYardName: "220kV Switchyard North",
      contactPerson: "Suresh Verma",
      contactNumber: "+91 91234 56789",
    },
  });
  console.log("✔ Sample site created");

  // ---- Sample Employees ----
  const companyAdmin = await prisma.employee.upsert({
    where: { email: "manager@transco.example" },
    update: {},
    create: {
      name: "Priya Sharma",
      code: "EMP-001",
      email: "manager@transco.example",
      mobileNumber: "+91 90000 11111",
      role: "COMPANY_ADMIN",
      companyId: company.id,
      department: "Operations",
      joiningDate: new Date("2023-04-01"),
    },
  });

  const supervisor = await prisma.employee.upsert({
    where: { email: "supervisor@transco.example" },
    update: {},
    create: {
      name: "Amit Patel",
      code: "EMP-002",
      email: "supervisor@transco.example",
      mobileNumber: "+91 90000 22222",
      role: "SUPERVISOR",
      companyId: company.id,
      department: "Site Engineering",
      joiningDate: new Date("2022-08-15"),
    },
  });

  const technician = await prisma.employee.upsert({
    where: { email: "tech@transco.example" },
    update: {},
    create: {
      name: "Vikram Singh",
      code: "EMP-003",
      email: "tech@transco.example",
      mobileNumber: "+91 90000 33333",
      role: "TECHNICIAN",
      companyId: company.id,
      department: "Field Testing",
      joiningDate: new Date("2024-01-10"),
    },
  });
  console.log("✔ Sample employees created");

  // ---- Create users linked to the sample employees ----
  await upsertUser({
    name: companyAdmin.name,
    email: companyAdmin.email,
    password: "Manager@123",
    role: "COMPANY_ADMIN",
    companyId: company.id,
    employeeId: companyAdmin.id,
  });
  await upsertUser({
    name: supervisor.name,
    email: supervisor.email,
    password: "Supervisor@123",
    role: "SUPERVISOR",
    companyId: company.id,
    employeeId: supervisor.id,
  });
  await upsertUser({
    name: technician.name,
    email: technician.email,
    password: "Tech@123",
    role: "TECHNICIAN",
    companyId: company.id,
    employeeId: technician.id,
  });
  console.log("✔ User logins created");

  // ---- Testing templates ----
  await prisma.testingTemplate.upsert({
    where: { code: "66KV_CT" },
    update: { isActive: true },
    create: {
      name: "66 KV CT Testing Report",
      code: "66KV_CT",
      version: "1.0",
      config: {
        tests: [
          "CT Polarity Test",
          "CT Core Identification Test",
          "CT Ratio Test",
          "CT Secondary Winding Resistance",
          "CT Series Test",
          "CT Insulation Resistance Measurement",
          "CT Knee Point Test",
        ],
      },
    },
  });
  await prisma.testingTemplate.upsert({
    where: { code: "66KV_LINE_CT" },
    update: { isActive: true },
    create: {
      name: "66 KV Line CT Testing Report",
      code: "66KV_LINE_CT",
      version: "1.0",
      config: {
        sections: [
          "general",
          "specification",
          "core",
          "capacitance",
          "insulation",
          "winding",
          "polarity",
          "core_identification",
          "ratio",
          "knee_point",
          "connection",
          "series",
          "metering",
        ],
      },
    },
  });
  await prisma.testingTemplate.upsert({
    where: { code: "POWER_TR_STAR_STAR" },
    update: { isActive: true },
    create: {
      name: "Power Transformer (Star-Star) Testing Report",
      code: "POWER_TR_STAR_STAR",
      version: "1.0",
      config: {
        sheets: [
          "ratio",
          "voltage_ratio",
          "mb_short_circuit",
          "charging_current",
          "winding_resistance",
          "vector_group_ir_bdv",
          "tan_delta",
        ],
      },
    },
  });
  console.log("✔ Testing templates created");

  console.log("\nDone. Login credentials:");
  console.log("  Master Admin : admin@cttesting.com / Admin@123");
  console.log("  Company Admin: manager@transco.example / Manager@123");
  console.log("  Supervisor    : supervisor@transco.example / Supervisor@123");
  console.log("  Technician    : tech@transco.example / Tech@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
