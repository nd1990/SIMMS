import { prisma } from "@/lib/prisma";

const year = () => new Date().getFullYear().toString();

export async function generateReportNumber(companyCode = "GEN") {
  const prefix = `CTR-${companyCode}-${year()}-`;

  // Count existing reports this year as the sequence base for determinism.
  const start = new Date(`${year()}-01-01T00:00:00.000Z`);
  const count = await prisma.testingReport.count({
    where: { createdAt: { gte: start } },
  });

  const seq = (count + 1).toString().padStart(4, "0");
  const base = `${prefix}${seq}`;

  // Ensure uniqueness even against concurrent / legacy records.
  const existing = await prisma.testingReport.findUnique({
    where: { reportNumber: base },
  });

  if (!existing) return base;

  let i = 2;
  // Retry a few times before giving a unique value.
  while (true) {
    const candidate = `${prefix}${(count + i).toString().padStart(4, "0")}`;
    const found = await prisma.testingReport.findUnique({
      where: { reportNumber: candidate },
    });
    if (!found) return candidate;
    i++;
  }
}
