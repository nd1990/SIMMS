"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { companySchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";

type Company = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  gstNumber: string | null;
  status: boolean;
  _count: { projects: number; sites: number; employees: number; reports: number };
};

type CompanyForm = z.infer<typeof companySchema>;

export function CompaniesClient({ initialData, canCreate }: { initialData: Company[]; canCreate: boolean }) {
  const [companies, setCompanies] = useState<Company[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      gstNumber: "",
      status: true,
    },
  });

  async function submit(values: CompanyForm) {
    setLoading(true);
    try {
      const url = editing ? `/api/companies/${editing.id}` : "/api/companies";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");

      toast("success", editing ? "Company updated" : "Company created");
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
      address: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      gstNumber: "",
      status: true,
    });
    setOpen(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    form.reset({
      name: company.name,
      code: company.code,
      address: company.address ?? "",
      contactPerson: company.contactPerson ?? "",
      contactNumber: company.contactNumber ?? "",
      email: company.email ?? "",
      gstNumber: company.gstNumber ?? "",
      status: company.status,
    });
    setOpen(true);
  }

  async function handleDelete(company: Company) {
    if (!window.confirm(`Delete company "${company.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      toast("success", "Company deleted");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function toggleStatus(company: Company) {
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          code: company.code,
          address: company.address ?? "",
          contactPerson: company.contactPerson ?? "",
          contactNumber: company.contactNumber ?? "",
          email: company.email ?? "",
          gstNumber: company.gstNumber ?? "",
          status: !company.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, status: !c.status } : c))
      );
      toast("success", !company.status ? "Company activated" : "Company deactivated");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  const statusToggle = canCreate;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div />
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Button>
        )}
      </div>

      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No companies yet"
          description="Create your first company to get started."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Projects</TableHead>
                <TableHead className="hidden lg:table-cell">Sites</TableHead>
                <TableHead className="hidden lg:table-cell">Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{company.name}</p>
                    <p className="text-xs text-slate-400">{company.address ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {company.code}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">{company.contactPerson ?? "—"}</p>
                    <p className="text-xs text-slate-400">{company.contactNumber ?? "—"}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{company._count.projects}</TableCell>
                  <TableCell className="hidden lg:table-cell">{company._count.sites}</TableCell>
                  <TableCell className="hidden lg:table-cell">{company._count.reports}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => statusToggle && toggleStatus(company)}
                      className={
                        company.status
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }
                    >
                      {company.status ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    {canCreate && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(company)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Company" : "New Company"}
        description="Company details shown on test reports and invoices."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(submit)} disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Create Company"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company name *</Label>
              <Input id="name" placeholder="Transco Pvt Ltd" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Company code *</Label>
              <Input id="code" placeholder="TRANSCO" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea rows={2} id="address" placeholder="Registered office address" {...form.register("address")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" placeholder="Full name" {...form.register("contactPerson")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Contact number</Label>
              <Input id="contactNumber" placeholder="+91 90000 00000" {...form.register("contactNumber")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contact@company.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST number</Label>
              <Input id="gstNumber" placeholder="GSTIN" {...form.register("gstNumber")} />
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}