import { redirect } from "next/navigation";

export const metadata = { title: "Submitted Reports" };

export const dynamic = "force-dynamic";

export default function SubmittedReportsPage() {
  redirect("/reports?status=SUBMITTED");
}