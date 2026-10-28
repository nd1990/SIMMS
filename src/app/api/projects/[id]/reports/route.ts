import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, apiError, RouteContext } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function loadProject(id: string, role: string, companyId?: string | null) {
  const where = role === "MASTER_ADMIN" ? { id } : { id, companyId: companyId ?? "none" };
  return prisma.project.findFirst({ where });
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const guard = await requireApiUser();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const project = await loadProject(id, guard.role, guard.companyId);
  if (!project) return apiError("Project not found", 404);

  const url = new URL(_req.url);
  const folderId = url.searchParams.get("folderId");

  const [folders, files] = await Promise.all([
    prisma.projectReportFolder.findMany({
      where: { projectId: id, parentId: folderId },
      orderBy: { name: "asc" },
    }),
    prisma.projectReportFile.findMany({
      where: { projectId: id, folderId: folderId },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  const allFolders = await prisma.projectReportFolder.findMany({
    where: { projectId: id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  const totalFiles = await prisma.projectReportFile.count({ where: { projectId: id } });

  const breadcrumb = [] as { id: string | null; name: string }[];
  if (folderId) {
    let current: any = await prisma.projectReportFolder.findFirst({ where: { id: folderId, projectId: id } });
    const stack = [] as any[];
    while (current) {
      stack.push(current);
      if (!current.parentId) break;
      current = await prisma.projectReportFolder.findFirst({ where: { id: current.parentId, projectId: id } });
    }
    stack.reverse().forEach((f) => breadcrumb.push({ id: f.id, name: f.name }));
  }

  return Response.json({ data: { project, folders, files, breadcrumb, allFolders, totalFiles } });
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  if (user.role === "TECHNICIAN") return apiError("Forbidden", 403);

  const { id } = await ctx.params;
  const project = await loadProject(id, user.role, user.companyId);
  if (!project) return apiError("Project not found", 404);

  // JSON requests are only used for folder creation; uploads are always multipart.
  const isJson = (request.headers.get("content-type") || "").includes("application/json");
  const form = isJson ? null : await request.formData().catch(() => null);
  const jsonBody = isJson ? await request.json().catch(() => null) : null;
  if (!form && !jsonBody) return apiError("Invalid form data", 400);

  const get = (key: string) => (form ? form.get(key) : (jsonBody?.[key] ?? null));

  const action = get("action");
  if (action === "create-folder") {
    const name = String(get("name") || "").trim();
    if (!name) return apiError("Folder name required", 400);
    const folderId = get("folderId");
    const parentId = folderId ? String(folderId) : null;
    if (parentId) {
      const parent = await prisma.projectReportFolder.findFirst({ where: { id: parentId, projectId: id } });
      if (!parent) return apiError("Parent folder not found", 404);
    }
    const folder = await prisma.projectReportFolder.create({
      data: { projectId: id, name, parentId },
    });
    return Response.json({ data: folder });
  }

  // upload
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("No file uploaded", 400);
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return apiError("Only PDF files are allowed", 400);
  }
  const max = 50 * 1024 * 1024;
  if (file.size > max) return apiError("File must be 50 MB or smaller", 400);

  const folderId = get("folderId");
  const parentId = folderId ? String(folderId) : null;
  if (parentId) {
    const parent = await prisma.projectReportFolder.findFirst({ where: { id: parentId, projectId: id } });
    if (!parent) return apiError("Folder not found", 404);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "uploads", "project-reports", id);
  await ensureDir(dir);

  const ext = ".pdf";
  const stored = `${Date.now()}-${randomUUID().slice(0, 12)}${ext}`;
  await writeFile(path.join(dir, stored), buffer);

  const created = await prisma.projectReportFile.create({
    data: {
      projectId: id,
      companyId: project.companyId,
      folderId: parentId,
      originalName: file.name,
      fileName: stored,
      storagePath: `uploads/project-reports/${id}/${stored}`,
      mimeType: "application/pdf",
      fileSize: file.size,
      reportType: get("reportType") ? String(get("reportType")) : null,
      uploadedById: user.id,
      uploadedByName: user.name,
    },
  });

  return Response.json({ data: created });
}
