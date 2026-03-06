import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Access Denied</h1>
        <p className="mt-2 text-sm text-zinc-600">
          You are signed in, but you do not have superadmin access.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          Back to Login
        </Link>
      </div>
    </main>
  );
}
