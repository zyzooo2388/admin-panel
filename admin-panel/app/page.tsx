import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Panel App</h1>
        <p className="mt-2 text-zinc-600">Use Google sign-in, then access the admin routes.</p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Login
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Open Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
