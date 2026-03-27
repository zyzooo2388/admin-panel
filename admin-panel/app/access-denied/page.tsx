import Link from "next/link";

import AuthLandingShell from "@/components/auth/AuthLandingShell";
import AccessDeniedSignOutButton from "@/components/auth/AccessDeniedSignOutButton";

export default function AccessDeniedPage() {
  return (
    <AuthLandingShell
      badgeLabel="Admin access"
      title="Access denied"
      description="Your current account is signed in successfully, but it does not have permission to open the admin panel."
      footer="Use an authorized team account to continue."
    >
      <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-xl sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M12 2a7 7 0 00-7 7v2.1c0 .53-.21 1.04-.59 1.41l-.7.7A2 2 0 005.12 17h13.76a2 2 0 001.41-3.39l-.7-.7a2 2 0 01-.59-1.41V9a7 7 0 00-7-7zm0 20a3 3 0 002.82-2H9.18A3 3 0 0012 22z"
              fill="currentColor"
            />
          </svg>
          Restricted route
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Please sign out and log back in with an email that has admin access.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          If you have multiple Google accounts, choose a different account when
          the sign-in prompt appears.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.32)] transition duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Back to login
          </Link>
          <AccessDeniedSignOutButton />
        </div>
      </div>
    </AuthLandingShell>
  );
}
