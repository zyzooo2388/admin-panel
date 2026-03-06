"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
