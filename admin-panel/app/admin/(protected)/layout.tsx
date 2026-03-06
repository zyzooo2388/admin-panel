import type { ReactNode } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await requireSuperadmin();

  return (
    <div className="min-h-screen bg-zinc-100 lg:flex">
      <AdminSidebar email={auth.user.email ?? null} />
      <main className="w-full p-4 lg:p-8">{children}</main>
    </div>
  );
}
