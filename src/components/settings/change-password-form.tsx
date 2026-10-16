"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

type ChangeForm = z.infer<typeof changeSchema>;

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<ChangeForm>({
    resolver: zodResolver(changeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  async function submit(values: ChangeForm) {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", "Password changed");
      form.reset();
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" type="password" {...form.register("currentPassword")} />
        {form.formState.errors.currentPassword && (
          <p className="text-xs text-red-500">{form.formState.errors.currentPassword.message}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type="password" {...form.register("newPassword")} />
          {form.formState.errors.newPassword && (
            <p className="text-xs text-red-500">{form.formState.errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input id="pw-confirm" type="password" {...form.register("confirm")} />
          {form.formState.errors.confirm && (
            <p className="text-xs text-red-500">{form.formState.errors.confirm.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}