import Link from "next/link";

import AccessDeniedSignOutButton from "@/components/auth/AccessDeniedSignOutButton";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.06)]">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your current account does not have admin access. Please sign out and
          log in with an authorized email.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          When you log in again, you may need to choose a different Google
          account.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-indigo-600"
          >
            Back to login
          </Link>
          <AccessDeniedSignOutButton />
        </div>
      </div>
    </main>
  );
}
