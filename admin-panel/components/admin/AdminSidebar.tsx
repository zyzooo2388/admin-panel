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
    <aside className="w-full border-b border-violet-100/80 bg-white/68 p-4 backdrop-blur-md shadow-[0_20px_40px_rgba(70,85,225,0.1)] lg:h-screen lg:w-72 lg:border-r lg:border-b-0 lg:p-6">
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 shadow-[0_8px_20px_rgba(139,92,246,0.12)]">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
              <path
                d="m12 2.8 1.66 3.6 3.95.57-2.86 2.8.67 3.95L12 11.94l-3.42 1.78.67-3.95-2.86-2.8 3.95-.57L12 2.8Z"
                fill="currentColor"
              />
            </svg>
          </span>
          Admin Panel
        </div>
        <p className="mt-3 truncate text-sm font-medium text-slate-800">{email ?? "Unknown user"}</p>
      </div>

      <nav className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[72vh]">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/admin" && pathname.startsWith("/admin/dashboard")) ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "border-indigo-200/90 bg-gradient-to-r from-indigo-50/95 to-violet-50/95 text-indigo-700 shadow-[0_10px_22px_rgba(70,85,225,0.16)]"
                  : "border-transparent bg-transparent text-slate-600 hover:border-violet-100 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`inline-flex h-2 w-2 rounded-full ${active ? "bg-indigo-500 shadow-[0_0_0_5px_rgba(129,140,248,0.2)]" : "bg-slate-300"}`} />
                {item.label}
              </span>
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
