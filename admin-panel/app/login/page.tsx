"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Login</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign in with Google to access the admin panel.</p>
        {isSwitchAccountFlow ? (
          <p className="mt-2 text-sm text-zinc-600">Please choose a different Google account.</p>
        ) : null}
        {hasSession ? (
          <p className="mt-2 text-sm text-zinc-600">
            Already signed in?{" "}
            <Link href="/admin" className="font-medium text-zinc-900 underline underline-offset-2">
              Continue to admin
            </Link>
            .
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Redirecting..." : "Sign in with Google"}
        </button>

        {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
      </div>
    </main>
  );
}
