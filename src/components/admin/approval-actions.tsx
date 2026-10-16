"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";

export function ApprovalActions({ reportId, canApprove }: { reportId: string; canApprove: boolean }) {
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  if (!canApprove) return null;

  async function run(action: "APPROVE" | "REJECT" | "REQUEST_CORRECTION") {
    setBusy(action);
    try {
      const res = await fetch(`/api/reports/${reportId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comments: comments.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      toast("success", `Report ${action === "APPROVE" ? "approved" : action === "REJECT" ? "rejected" : "sent back for correction"}`);
      setComments("");
      router.refresh();
    } catch (e) {
      toast("error", getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Approval decision</h3>
      <Textarea
        rows={2}
        placeholder="Comments (required for rejection / correction requests)…"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          disabled={busy !== null}
          onClick={() => run("APPROVE")}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {busy === "APPROVE" ? "Approving…" : "Approve"}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("REQUEST_CORRECTION")}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Request Changes
        </Button>
        <Button
          variant="destructive"
          disabled={busy !== null}
          onClick={() => run("REJECT")}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}