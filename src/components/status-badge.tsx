import { Badge } from "@/components/ui/badge";

const colorMap: Record<string, string> = {
  DRAFT: "secondary",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  CORRECTION_REQUESTED: "warning",
  GENERATED: "default",
  ASSIGNED: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
  NOT_STARTED: "secondary",
  PENDING: "warning",
  PASS: "success",
  FAIL: "destructive",
} as const;

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const variant = (colorMap[status] ?? "secondary") as
    | "secondary"
    | "default"
    | "success"
    | "destructive"
    | "warning";
  return <Badge variant={variant}>{label ?? status.replace(/_/g, " ")}</Badge>;
}