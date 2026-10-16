"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleLogout() {
    setBusy(true);
    try {
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    } catch {
      toast("error", "Logout failed");
      setBusy(false);
    }
  }

  return (
    <Button variant="destructive" className="w-full" onClick={handleLogout} disabled={busy}>
      <LogOut className="mr-2 h-4 w-4" />
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}