import { apiError, requireApiUser } from "@/lib/api";

export async function POST() {
  const user = await requireApiUser();
  if ("error" in user) return user.error;
  return apiError("Report approval is not part of the submission workflow.", 410);
}