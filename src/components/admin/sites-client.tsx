"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2, MapPin } from "lucide-react";
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
import { siteSchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";

type Site = {
  id: string;
  name: string;
  code: string;
  companyId: string;
  projectId: string | null;
  company: { name: string };
  project?: { name: string } | null;
  address: string | null;
  switchYardName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  status: boolean;
  _count: { reports: number };
};

type Company = { id: string; name: string };
type Project = { id: string; name: string; companyId: string };

type SiteForm = z.infer<typeof siteSchema>;

export function SitesClient({
  initialData,
  companies,
  projects,
  canManage,
}: {
  initialData: Site[];
  companies: Company[];
  projects: Project[];
  canManage: boolean;
}) {
  const [sites, setSites] = useState<Site[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SiteForm>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      code: "",
      companyId: companies[0]?.id ?? "",
      projectId: "",
      address: "",
      switchYardName: "",
      contactPerson: "",
      contactNumber: "",
      status: true,
    },
  });

  const watchedCompany = form.watch("companyId");
  const companyProjects = projects.filter((p) => p.companyId === watchedCompany);

  async function submit(values: SiteForm) {
    setLoading(true);
    try {
      const url = editing ? `/api/sites/${editing.id}` : "/api/sites";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", editing ? "Site updated" : "Site created");
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
    form.reset({
      name: "",
      code: "",
      companyId: companies[0]?.id ?? "",
      projectId: "",
      address: "",
      switchYardName: "",
      contactPerson: "",
      contactNumber: "",
      status: true,
    });
    setOpen(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    form.reset({
      name: site.name,
      code: site.code,
      companyId: site.companyId,
      projectId: site.projectId ?? "",
      address: site.address ?? "",
      switchYardName: site.switchYardName ?? "",
      contactPerson: site.contactPerson ?? "",
      contactNumber: site.contactNumber ?? "",
      status: site.status,
    });
    setOpen(true);
  }

  async function handleDelete(site: Site) {
    if (!window.confirm(`Delete site "${site.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      toast("success", "Site deleted");
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
            New Site
          </Button>
        )}
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="No sites yet"
          description="Add test sites under your projects."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden lg:table-cell">Switchyard</TableHead>
                <TableHead className="hidden lg:table-cell">Reports</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{site.name}</p>
                    <p className="text-xs text-slate-400">{site.company?.name ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {site.code}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{site.project?.name ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{site.switchYardName ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{site._count.reports}</TableCell>
                  <TableCell>
                    <span
                      className={
                        site.status
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }
                    >
                      {site.status ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(site)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(site)}>
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
        title={editing ? "Edit Site" : "New Site"}
        description="A site is a physical test location (e.g., a substation switchyard)."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(submit)} disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Create Site"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-company">Company *</Label>
              <Select {...form.register("companyId")}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-project">Project</Label>
              <Select {...form.register("projectId")}>
                <option value="">— None —</option>
                {companyProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Site name *</Label>
              <Input id="s-name" placeholder="220kV GIS Bay" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-code">Site code *</Label>
              <Input id="s-code" placeholder="SITE-001" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-yard">Switchyard name</Label>
              <Input id="s-yard" placeholder="400kV Switchyard" {...form.register("switchYardName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-contact">Contact person</Label>
              <Input id="s-contact" {...form.register("contactPerson")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Contact number</Label>
              <Input id="s-phone" {...form.register("contactNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-address">Address</Label>
              <Input id="s-address" {...form.register("address")} />
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}