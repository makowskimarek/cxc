import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminRoot() {
  const session = await auth();
  if (session?.user?.role === "judge") {
    redirect("/admin/measure");
  }
  redirect("/admin/events");
}
