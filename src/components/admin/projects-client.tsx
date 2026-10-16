"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2, FolderKanban } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { projectSchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  code: string;
  companyId: string;
  company: { name: string; code: string };
  epcCompany: string | null;
  location: string | null;
  description: string | null;
  status: boolean;
  _count: { sites: number; reports: number };
};

type Company = { id: string; name: string; code: string };

type ProjectForm = z.infer<typeof projectSchema>;

export function ProjectsClient({
  initialData,
  companies,
  canManage,
}: {
  initialData: Project[];
  companies: Company[];
  canManage: boolean;
}) {
  const [projects, setProjects] = useState<Project[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      code: "",
      companyId: companies[0]?.id ?? "",
      epcCompany: "",
      location: "",
      description: "",
      status: true,
    },
  });

  async function submit(values: ProjectForm) {
    setLoading(true);
    try {
      const url = editing ? `/api/projects/${editing.id}` : "/api/projects";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", editing ? "Project updated" : "Project created");
      setOpen(false);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", code: "", companyId: companies[0]?.id ?? "", epcCompany: "", location: "", description: "", status: true });
    setOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    form.reset({
      name: project.name,
      code: project.code,
      companyId: project.companyId,
      epcCompany: project.epcCompany ?? "",
      location: project.location ?? "",
      description: project.description ?? "",
      status: project.status,
    });
    setOpen(true);
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast("success", "Project deleted");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div />
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-10 w-10" />}
          title="No projects yet"
          description="Create a project to group sites under a commission."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">EPC</TableHead>
                <TableHead className="hidden lg:table-cell">Sites</TableHead>
                <TableHead className="hidden lg:table-cell">Reports</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{project.name}</p>
                    <p className="text-xs text-slate-400">{project.location ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {project.code}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{project.company.name}</TableCell>
                  <TableCell className="hidden lg:table-cell">{project.epcCompany ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{project._count.sites}</TableCell>
                  <TableCell className="hidden lg:table-cell">{project._count.reports}</TableCell>
                  <TableCell>
                    <span
                      className={
                        project.status
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }
                    >
                      {project.status ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(project)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Project" : "New Project"}
        description="A project groups test sites under a commission."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(submit)} disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Create Project"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-company">Company *</Label>
            <Select {...form.register("companyId")}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Project name *</Label>
              <Input id="p-name" placeholder="400kV substation" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-code">Project code *</Label>
              <Input id="p-code" placeholder="PRJ-2026-001" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-epc">EPC company</Label>
              <Input id="p-epc" placeholder="EPC contractor" {...form.register("epcCompany")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-location">Location</Label>
              <Input id="p-location" placeholder="City, State" {...form.register("location")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-description">Description</Label>
            <Textarea rows={2} id="p-description" {...form.register("description")} />
          </div>
        </form>
      </Dialog>
    </>
  );
}