"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AuthLandingShell from "@/components/auth/AuthLandingShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPageClient() {
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const searchParams = useSearchParams();
  const isSwitchAccountFlow = searchParams.get("switch") === "1";
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasSupabasePublicEnv ? null : "Supabase public env vars are missing.",
  );

  useEffect(() => {
    if (!hasSupabasePublicEnv) {
      return;
    }

    let isActive = true;
    const supabase = createSupabaseBrowserClient();

    void (async () => {
      const { data } = await supabase.auth.getSession();

      if (isActive) {
        setHasSession(Boolean(data.session));
      }
    })();

    return () => {
      isActive = false;
    };
  }, [hasSupabasePublicEnv]);

  const handleGoogleSignIn = async () => {
    if (!hasSupabasePublicEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  return (
    <AuthLandingShell
      badgeLabel="Admin access"
      title="Admin Login"
      description="Sign in with Google to access the admin panel."
      footer="Secure admin access for authorized team members."
    >
      <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-xl sm:p-7">
        {isSwitchAccountFlow ? (
          <p className="text-sm text-slate-500">Please choose a different Google account.</p>
        ) : null}
        {hasSession ? (
          <p className="mt-3 text-sm text-slate-500">
            Already signed in?{" "}
            <Link href="/admin" className="font-medium text-indigo-700 underline underline-offset-2">
              Continue to admin
            </Link>
            .
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="mt-6 inline-flex w-full justify-center rounded-xl border border-violet-400/40 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.32)] transition duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Redirecting..." : "Sign in with Google"}
        </button>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/85 px-4 py-3 text-sm text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.08)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </AuthLandingShell>
  );
}
