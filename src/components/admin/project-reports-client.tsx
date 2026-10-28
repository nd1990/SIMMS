"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye, FileText, Folder, FolderInput, FolderPlus, Grid, List, MoveRight, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";

type Folder = { id: string; name: string; parentId: string | null; createdAt: string };
type FileItem = {
  id: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  reportType: string | null;
  uploadedAt: string;
  uploadedByName: string | null;
  folderId: string | null;
};

export function ProjectReportsClient({
  projectId,
  projectName,
  canManage,
}: {
  projectId: string;
  projectName: string;
  canManage: boolean;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [moveReportOpen, setMoveReportOpen] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState("");
  const [moveReportFolder, setMoveReportFolder] = useState("");
  const [moveReportBusy, setMoveReportBusy] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [moveProjectOpen, setMoveProjectOpen] = useState(false);
  const [fileToProject, setFileToProject] = useState<FileItem | null>(null);
  const [targetProject, setTargetProject] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = folderId ? `?folderId=${folderId}` : "";
      const res = await fetch(`/api/projects/${projectId}/reports${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setFolders(json.data.folders ?? []);
      setFiles(json.data.files ?? []);
      setBreadcrumb(json.data.breadcrumb ?? []);
      setAllFolders(json.data.allFolders ?? []);
      setTotalFiles(json.data.totalFiles ?? 0);
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId, toast]);

  const loadAll = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return files.filter((f) => {
      if (!q) return true;
      return f.originalName.toLowerCase().includes(q) || (f.reportType || "").toLowerCase().includes(q);
    });
  }, [files, query]);

  async function upload(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      for (let i = 0; i < filesList.length; i++) {
        const f = filesList[i];
        const fd = new FormData();
        fd.append("file", f);
        if (folderId) fd.append("folderId", folderId);
        const res = await fetch(`/api/projects/${projectId}/reports`, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        setUploadProgress(40 + (i * 40) / filesList.length);
      }
      setUploadProgress(100);
      toast("success", "PDF uploaded");
      await load();
      await loadAll();
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      const fd = new FormData();
      fd.append("action", "create-folder");
      fd.append("name", newFolderName.trim());
      if (folderId) fd.append("folderId", folderId);
      const res = await fetch(`/api/projects/${projectId}/reports`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast("success", "Folder created");
      setNewFolderOpen(false);
      setNewFolderName("");
      await load();
      await loadAll();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function doRename() {
    if (!fileToRename || !renameName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/${fileToRename.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: renameName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast("success", "Renamed");
      setRenameOpen(false);
      setFileToRename(null);
      await load();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function doMove() {
    if (!fileToMove) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/${fileToMove.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: moveTarget || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast("success", "Moved");
      setMoveOpen(false);
      setFileToMove(null);
      await load();
      await loadAll();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function deleteFile(f: FileItem) {
    if (!window.confirm(`Delete "${f.originalName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/${f.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast("success", "Deleted");
      await load();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function deleteFolder(f: Folder) {
    if (!window.confirm(`Delete folder "${f.name}"? It must be empty.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/folders/${f.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast("success", "Folder deleted");
      if (folderId === f.id) setFolderId(null);
      await load();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(json.data) ? json.data : json.data?.projects ?? [];
        setProjects(list.filter((p: any) => p.id !== projectId));
      }
    } catch {}
  }

  async function moveToAnotherProject() {
    if (!fileToProject || !targetProject) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/reports/${fileToProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProjectId: targetProject }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error ?? "Could not move file");
      toast("success", "File moved to selected project");
      setMoveProjectOpen(false);
      setFileToProject(null);
      setTargetProject("");
      await load();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function loadReports() {
    try {
      const res = await fetch("/api/reports");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setReports(json.data || []);
    } catch {}
  }

  async function moveReportToProject() {
    if (!selectedReport) {
      toast("error", "Select a testing report first");
      return;
    }
    try {
      setMoveReportBusy(true);
      const res = await fetch(`/api/reports/${selectedReport}/move-to-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport,
          projectId,
          folderId: moveReportFolder || null,
        }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error ?? "Could not move the report");
      toast("success", json?.data?.projectName ? `Moved to ${json.data.projectName}` : "Moved to project");
      setMoveReportOpen(false);
      setSelectedReport("");
      await load();
      await loadAll();
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setMoveReportBusy(false);
    }
  }

  function fmtSize(b: number) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/projects" className="flex items-center gap-1 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <span>/</span>
          <button onClick={() => setFolderId(null)} className="hover:text-slate-900">{projectName}</button>
          {breadcrumb.map((b) => (
            <span key={b.id ?? "root"} className="flex items-center gap-2">
              <span>/</span>
              <button onClick={() => setFolderId(b.id)} className="hover:text-slate-900">{b.name}</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files..." className="w-48 pl-8" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setView(view === "list" ? "grid" : "list")}>
            {view === "list" ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => { loadReports(); setMoveReportOpen(true); }}>
                <MoveRight className="mr-2 h-4 w-4" />
                Move from Testing Reports
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setNewFolderOpen(true); setNewFolderName(""); }}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
              <Button size="sm" onClick={() => inputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </Button>
              <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-blue-500 transition-all" style={{ width: uploadProgress + "%" }} />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-2 text-sm text-slate-500">
          Reports • {filtered.length} shown / {totalFiles} total file(s), {folders.length} folder(s)
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : folders.length === 0 && filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No files or folders yet. Upload PDFs or create a folder.</div>
        ) : view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Size</th>
                  <th className="px-4 py-2 text-left">Uploaded</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <button onClick={() => setFolderId(f.id)} className="flex items-center gap-2 text-slate-900">
                        <Folder className="h-4 w-4 text-amber-500" />
                        {f.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-slate-500">Folder</td>
                    <td className="px-4 py-2 text-slate-500">—</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteFolder(f)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500" />
                        <span className="truncate">{f.originalName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{f.reportType || "PDF"}</td>
                    <td className="px-4 py-2 text-slate-500">{fmtSize(f.fileSize)}</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(f.uploadedAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/api/projects/${projectId}/reports/${f.id}`, "_blank")}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { const a = document.createElement("a"); a.href = `/api/projects/${projectId}/reports/${f.id}`; a.download = f.originalName; a.click(); }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setFileToRename(f); setRenameName(f.originalName); setRenameOpen(true); }}>
                              Rename
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { loadAll(); setFileToMove(f); setMoveTarget(f.folderId || ""); setMoveOpen(true); }}>
                              <MoveRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { loadProjects(); setFileToProject(f); setTargetProject(""); setMoveProjectOpen(true); }}>
                              <FolderInput className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteFile(f)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {folders.map((f) => (
              <button key={f.id} onClick={() => setFolderId(f.id)} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                <Folder className="h-10 w-10 text-amber-500" />
                <span className="truncate text-sm">{f.name}</span>
              </button>
            ))}
            {filtered.map((f) => (
              <div key={f.id} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4">
                <FileText className="h-10 w-10 text-red-500" />
                <span className="w-full truncate text-center text-xs">{f.originalName}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/projects/${projectId}/reports/${f.id}`, "_blank")}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { const a = document.createElement("a"); a.href = `/api/projects/${projectId}/reports/${f.id}`; a.download = f.originalName; a.click(); }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New Folder" footer={
        <>
          <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
          <Button onClick={createFolder}>Create</Button>
        </>
      }>
        <div className="space-y-2">
          <Label>Folder name</Label>
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. CT Reports" />
        </div>
      </Dialog>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename File" footer={
        <>
          <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button onClick={doRename}>Save</Button>
        </>
      }>
        <div className="space-y-2">
          <Label>File name</Label>
          <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} />
        </div>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} title="Move File" footer={
        <>
          <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
          <Button onClick={doMove}>Move</Button>
        </>
      }>
        <div className="space-y-2">
          <Label>Move to folder</Label>
          <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="w-full rounded-md border border-slate-300 p-2">
            <option value="">Root (Project folder)</option>
            {allFolders.filter((f) => f.id !== fileToMove?.folderId).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </Dialog>

      <Dialog open={moveProjectOpen} onClose={() => setMoveProjectOpen(false)} title="Move File to Another Project" footer={
        <>
          <Button variant="outline" onClick={() => setMoveProjectOpen(false)}>Cancel</Button>
          <Button onClick={moveToAnotherProject} disabled={!targetProject}>Move</Button>
        </>
      }>
        <div className="space-y-2">
          <Label>Target project</Label>
          <select value={targetProject} onChange={(e) => setTargetProject(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
          {projects.length === 0 && <p className="text-xs text-slate-500">No other projects available.</p>}
        </div>
      </Dialog>

      <Dialog open={moveReportOpen} onClose={() => !moveReportBusy && setMoveReportOpen(false)} title="Move Testing Report to Project" footer={
        <>
          <Button variant="outline" onClick={() => setMoveReportOpen(false)} disabled={moveReportBusy}>Cancel</Button>
          <Button onClick={moveReportToProject} disabled={moveReportBusy || !selectedReport}>
            {moveReportBusy ? "Moving..." : "Move"}
          </Button>
        </>
      }>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Select Testing Report</Label>
            <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900">
              <option value="">-- Select --</option>
              {reports.map((r: any) => (
                <option key={r.id} value={r.id}>{r.reportNumber} - {r.testingType} ({r.status})</option>
              ))}
            </select>
            {reports.length === 0 && (
              <p className="text-xs text-slate-500">No testing reports available for this company.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Folder (optional)</Label>
            <select value={moveReportFolder} onChange={(e) => setMoveReportFolder(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900">
              <option value="">Root</option>
              {allFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
