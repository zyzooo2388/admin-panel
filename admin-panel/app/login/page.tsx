import { Suspense } from "react";

import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-zinc-900">Admin Login</h1>
            <p className="mt-2 text-sm text-zinc-600">Loading login...</p>
          </div>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
