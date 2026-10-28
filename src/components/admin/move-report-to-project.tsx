"use client";

import { useEffect, useState } from "react";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/utils";

type Project = { id: string; name: string; code: string };

export function MoveReportToProject({ reportId, projects }: { reportId: string; projects: Project[] }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <MoveRight className="mr-1 h-3.5 w-3.5" />
        Move to Project
      </Button>
    );
  }

  function openDialog() {
    setProjectId("");
    setError("");
    setOpen(true);
  }

  async function move() {
    if (!projectId) {
      setError("Please select a project first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/move-to-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, projectId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not move the report");
      const name = json?.data?.projectName;
      toast("success", name ? `Moved to ${name}` : "Moved to project");
      setOpen(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      toast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={openDialog} disabled={loading}>
        <MoveRight className="mr-1 h-3.5 w-3.5" />
        {loading ? "Moving..." : "Move to Project"}
      </Button>
      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Move Report to Project"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={move} disabled={loading || !projectId}>
              {loading ? "Moving..." : "Move"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setError("");
            }}
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="text-xs text-amber-600">No projects found for your company. Create a project first.</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
