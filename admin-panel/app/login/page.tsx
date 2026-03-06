"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasSupabasePublicEnv ? null : "Supabase public env vars are missing.",
  );

  useEffect(() => {
    if (!hasSupabasePublicEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session || !isMounted) {
        return;
      }

      router.replace("/admin");
      router.refresh();
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session || !isMounted) {
        return;
      }

      router.replace("/admin");
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hasSupabasePublicEnv, router]);

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
