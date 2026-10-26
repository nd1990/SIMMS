"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { employeeSchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";
import { withBasePath } from "@/lib/employee-stamps";
import { roleLabel } from "@/lib/permissions";
import type { Role } from "@prisma/client";

type Employee = {
  id: string;
  name: string;
  code: string;
  email: string;
  mobileNumber: string | null;
  role: Role;
  companyId: string;
  company?: { name: string };
  department: string | null;
  designation: string | null;
  designationGrade: string | null;
  stampPath: string | null;
  status: boolean;
  joiningDate: string | null;
  user?: { id: string; status: string } | null;
};

type Company = { id: string; name: string };

type EmployeeForm = z.infer<typeof employeeSchema>;

export function EmployeesClient({
  initialData,
  companies,
  canManage,
  canCreateLogin,
}: {
  initialData: Employee[];
  companies: Company[];
  canManage: boolean;
  canCreateLogin?: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [stampPath, setStampPath] = useState<string>("");
  const [stampUploading, setStampUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      code: "",
      email: "",
      mobileNumber: "",
      role: "TECHNICIAN",
      companyId: companies[0]?.id ?? "",
      department: "",
      designation: "",
      designationGrade: "",
      status: true,
      joiningDate: "",
      createLogin: false,
      password: "",
    },
  });

  const createLogin = form.watch("createLogin");
  const hasLogin = Boolean(editing?.user);

  async function submit(values: EmployeeForm) {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...values, stampPath };
      if (!values.createLogin || !values.password) delete payload.password;
      if (hasLogin) delete payload.createLogin;
      const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", editing ? "Employee updated" : "Employee added");
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
    setStampPath("");
    form.reset({
      name: "",
      code: "",
      email: "",
      mobileNumber: "",
      role: "TECHNICIAN",
      companyId: companies[0]?.id ?? "",
      department: "",
      designation: "",
      designationGrade: "",
      status: true,
      joiningDate: "",
      createLogin: true,
      password: "",
    });
    setOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setStampPath(employee.stampPath ?? "");
    form.reset({
      name: employee.name,
      code: employee.code,
      email: employee.email,
      mobileNumber: employee.mobileNumber ?? "",
      role: employee.role as EmployeeForm["role"],
      companyId: employee.companyId,
      department: employee.department ?? "",
      designation: employee.designation ?? "",
      designationGrade: employee.designationGrade ?? "",
      status: employee.status,
      joiningDate: employee.joiningDate ? employee.joiningDate.slice(0, 10) : "",
      createLogin: false,
      password: "",
    });
    setOpen(true);
  }

  async function handleDelete(employee: Employee) {
    if (!window.confirm(`Delete employee "${employee.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      toast("success", "Employee deleted");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  async function handleStampUpload(file: File) {
    setStampUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStampPath(json.data.path as string);
      toast("success", "Stamp uploaded");
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setStampUploading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div />
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Employee
          </Button>
        )}
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No employees yet"
          description="Add engineers and technicians to assign testing work."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Designation</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{employee.name}</p>
                    <p className="text-xs text-slate-400">{employee.department ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {employee.code}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{employee.company?.name ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {employee.designation ?? "—"}
                    {employee.designationGrade ? ` (${employee.designationGrade})` : ""}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {roleLabel(employee.role)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {employee.user ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        User
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-400">
                        No login
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        employee.status
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }
                    >
                      {employee.status ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(employee)}>
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(employee)}>
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
        title={editing ? "Edit Employee" : "New Employee"}
        description="Add personnel who will perform testing and enter report data."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(submit)} disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Add Employee"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Full name *</Label>
              <Input id="e-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-code">Employee code *</Label>
              <Input id="e-code" placeholder="EMP-004" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-email">Email *</Label>
              <Input id="e-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-mobile">Mobile number</Label>
              <Input id="e-mobile" {...form.register("mobileNumber")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-company">Company *</Label>
              <Select {...form.register("companyId")}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-role">Role *</Label>
              <Select {...form.register("role")}>
                <option value="TECHNICIAN">Field Technician</option>
                <option value="SUPERVISOR">Site Engineer</option>
                <option value="COMPANY_ADMIN">Company Admin</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-designation">Designation</Label>
              <Input id="e-designation" placeholder="Testing Engineer" {...form.register("designation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-grade">Grade</Label>
              <Input id="e-grade" placeholder="E1 / Grade A" {...form.register("designationGrade")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-dept">Department</Label>
              <Input id="e-dept" placeholder="Field Testing" {...form.register("department")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-joining">Joining date</Label>
              <Input id="e-joining" type="date" {...form.register("joiningDate")} />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Signature stamp
            </p>
            <div className="flex items-center gap-4">
              {stampPath ? (
                <img
                  src={withBasePath(stampPath)}
                  alt="Stamp preview"
                  className="h-16 w-auto rounded border border-slate-200 bg-white object-contain dark:border-slate-700"
                />
              ) : (
                <div className="flex h-16 w-20 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-slate-600">
                  No stamp
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  <Upload className="h-3.5 w-3.5" />
                  {stampUploading ? "Uploading…" : stampPath ? "Change stamp" : "Upload stamp"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={stampUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleStampUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {stampPath && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setStampPath("")}>
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shown next to the Tested By signature on Power Transformer reports. PNG/JPEG/WebP, max 2 MB.
            </p>
          </div>

          {canCreateLogin && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Login account
              </p>

              {hasLogin ? (
                <div className="space-y-1.5">
                  <Label htmlFor="e-password">Reset password (leave blank to keep current)</Label>
                  <Input
                    id="e-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
                  )}
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-slate-900 dark:border-slate-600"
                      {...form.register("createLogin")}
                    />
                    Create login account for this employee
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Username will be the employee email address.
                  </p>

                  {createLogin && (
                    <div className="space-y-1.5">
                      <Label htmlFor="e-password">Password *</Label>
                      <Input
                        id="e-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        {...form.register("password")}
                      />
                      {form.formState.errors.password && (
                        <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </form>
      </Dialog>
    </>
  );
}