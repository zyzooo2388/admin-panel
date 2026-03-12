"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/resources";

type Props = {
  email: string | null;
};

export default function AdminSidebar({ email }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-zinc-200 bg-white p-4 lg:h-screen lg:w-64 lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Admin Panel</p>
        <p className="mt-1 truncate text-sm text-zinc-700">{email ?? "Unknown user"}</p>
      </div>

      <nav className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 lg:max-h-[72vh]">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </aside>
  );
}
