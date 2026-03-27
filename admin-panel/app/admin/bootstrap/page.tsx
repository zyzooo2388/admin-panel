/**
 * BIG WARNING: Delete this route (`/admin/bootstrap`) after first successful use.
 * Leaving this route in production increases risk if the bootstrap token leaks.
 */

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function BootstrapPage({ searchParams }: Props) {
  const auth = await requireSuperadmin();
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Bootstrap</h1>
        <p className="mt-3 text-slate-700">Missing token. Use <code>/admin/bootstrap?token=...</code>.</p>
      </main>
    );
  }

  if (token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Bootstrap</h1>
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">Invalid bootstrap token.</p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_superadmin: true,
      modified_by_user_id: auth.user.id,
    })
    .eq("id", auth.user.id);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Admin Bootstrap</h1>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to grant superadmin: {error.message}
        </p>
      ) : (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <p className="font-semibold">Success. Your account is now a superadmin.</p>
          <p className="mt-1 text-sm">Go to <a className="underline" href="/admin">/admin</a> and then delete this bootstrap route.</p>
        </div>
      )}
    </main>
  );
}
