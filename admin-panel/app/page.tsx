import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 sm:p-8">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/70 bg-white/85 p-8 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_20px_56px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10">
        <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
          Admin access
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Admin Panel App</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Use Google sign-in, then access the admin routes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] transition hover:bg-indigo-700"
          >
            Login
          </Link>
          <Link
            href="/admin"
            className="inline-flex justify-center rounded-xl border border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Admin
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">Secure admin access for authorized team members.</p>
      </div>
    </main>
  );
}
