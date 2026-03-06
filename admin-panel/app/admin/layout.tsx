import type { ReactNode } from "react";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSuperadmin();
  return children;
}
