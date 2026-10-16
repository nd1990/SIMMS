import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomePath } from "@/lib/permissions";

export default async function Home() {
  const session = await getServerSession(authOptions);
  redirect(session?.user ? getHomePath(session.user.role) : "/login");
}