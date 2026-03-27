import { Suspense } from "react";

import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.06)]">
            <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
            <p className="mt-2 text-sm text-slate-500">Loading login...</p>
          </div>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
