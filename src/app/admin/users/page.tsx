import { redirect } from "next/navigation";
import { requireAdminFromDb } from "@/lib/api-auth";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const admin = await requireAdminFromDb();

  if (!admin) {
    redirect("/dashboard");
  }

  return <AdminUsersClient />;
}
