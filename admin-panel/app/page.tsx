import Link from "next/link";

import AuthLandingShell from "@/components/auth/AuthLandingShell";

export default function Home() {
  return (
    <AuthLandingShell
      badgeLabel="Admin access"
      title="Admin Panel App"
      description="Use Google sign-in, then access the admin routes."
      footer="Secure admin access for authorized team members."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/login"
          className="inline-flex justify-center rounded-xl border border-violet-400/40 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.32)] transition duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          Login
        </Link>
        <Link
          href="/admin"
          className="inline-flex justify-center rounded-xl border border-slate-200/80 bg-white/78 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_18px_rgba(148,163,184,0.14)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        >
          Open Admin
        </Link>
      </div>
    </AuthLandingShell>
  );
}
