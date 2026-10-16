"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2, UserCog } from "lucide-react";
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
import { userSchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import type { Role, UserStatus } from "@prisma/client";

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  companyId: string | null;
  employeeId: string | null;
  createdAt: string;
  company?: { name: string } | null;
  employee?: { name: string; code: string } | null;
};

type Company = { id: string; name: string };
type EmployeeOption = { id: string; name: string; code: string };

type UserForm = z.infer<typeof userSchema>;

export function UsersClient({
  initialData,
  companies,
  employees,
}: {
  initialData: CompanyUser[];
  companies: Company[];
  employees: EmployeeOption[];
}) {
  const [users, setUsers] = useState<CompanyUser[]>(initialData);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "SUPERVISOR",
      companyId: companies[0]?.id ?? "",
      employeeId: "",
      password: "",
      status: "ACTIVE",
    },
  });

  const selectedRole = form.watch("role");

  async function submit(values: UserForm) {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...values, employeeId: values.employeeId || null };
      if (!editing) {
        payload.password = values.password || "ChangeMe@123";
      } else if (values.password) {
        payload.password = values.password;
      }
      const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", editing ? "User updated" : "Login account created");
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
      email: "",
      role: "SUPERVISOR",
      companyId: companies[0]?.id ?? "",
      employeeId: "",
      password: "",
      status: "ACTIVE",
    });
    setOpen(true);
  }

  function openEdit(u: CompanyUser) {
    setEditing(u);
    form.reset({
      name: u.name,
      email: u.email,
      role: u.role,
      companyId: u.companyId ?? companies[0]?.id ?? "",
      employeeId: u.employeeId ?? "",
      password: "",
      status: u.status,
    });
    setOpen(true);
  }

  async function handleDelete(u: CompanyUser) {
    if (!window.confirm(`Delete login for "${u.email}"? The user is removed immediately.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast("success", "User deleted");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    }
  }

  const statusColor: Record<UserStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    INACTIVE: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    SUSPENDED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  };

  const availableEmployees = editing
    ? employees
    : employees.filter((e) => !users.some((u) => u.employeeId === e.id));

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-10 w-10" />}
          title="No login accounts"
          description="Create accounts so employees can sign in."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Linked employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{u.company?.name ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {u.employee ? `${u.employee.name} (${u.employee.code})` : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                      {roleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[u.status]}`}>
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
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
        title={editing ? "Edit User" : "New Login Account"}
        description="Create or update credentials for signing into the system."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(submit)} disabled={loading}>
              {loading ? "Saving…" : editing ? "Save Changes" : "Create User"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Full name *</Label>
              <Input id="u-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role *</Label>
              <Select {...form.register("role")}>
                <option value="MASTER_ADMIN">Master Admin</option>
                <option value="COMPANY_ADMIN">Company Admin</option>
                <option value="SUPERVISOR">Site Engineer</option>
                <option value="TECHNICIAN">Field Technician</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-status">Status</Label>
              <Select {...form.register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-company">Company</Label>
              <Select {...form.register("companyId")} disabled={selectedRole === "MASTER_ADMIN"}>
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-employee">Link to employee</Label>
              <Select {...form.register("employeeId")}>
                <option value="">— None —</option>
                {availableEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">{editing ? "Reset password (leave blank to keep)" : "Password *"}</Label>
            <Input id="u-password" type="password" placeholder={editing ? "••••••" : "Min. 6 characters"} {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}