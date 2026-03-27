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
    <div className="admin-shell min-h-screen lg:flex">
      <AdminSidebar email={auth.user.email ?? null} />
      <main className="w-full p-5 lg:p-8 xl:p-10">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
