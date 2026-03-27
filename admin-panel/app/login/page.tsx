import { Suspense } from "react";

import AuthLandingShell from "@/components/auth/AuthLandingShell";

import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLandingShell
          badgeLabel="Admin access"
          title="Admin Login"
          description="Sign in with Google to access the admin panel."
          footer="Secure admin access for authorized team members."
        >
          <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_32px_rgba(148,163,184,0.12)]">
            <p className="text-sm text-slate-500">Loading login...</p>
          </div>
        </AuthLandingShell>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
