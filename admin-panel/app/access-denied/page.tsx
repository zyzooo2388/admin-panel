import Link from "next/link";

import AccessDeniedSignOutButton from "@/components/auth/AccessDeniedSignOutButton";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Access denied</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your current account does not have admin access. Please sign out and
          log in with an authorized email.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          When you log in again, you may need to choose a different Google
          account.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Back to login
          </Link>
          <AccessDeniedSignOutButton />
        </div>
      </div>
    </main>
  );
}
