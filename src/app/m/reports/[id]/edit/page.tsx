import { MobileReportView } from "../report-view";

export const dynamic = "force-dynamic";

export default async function MobileReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  return <MobileReportView params={params} mode="edit" />;
}
