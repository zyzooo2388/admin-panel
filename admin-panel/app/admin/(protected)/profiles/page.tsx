import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { CREATED_TIMESTAMP_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilesPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const emailColumn = await pickFirstWorkingColumn(supabase, "profiles", ["email"]);
  const createdColumn = await pickFirstWorkingColumn(supabase, "profiles", CREATED_TIMESTAMP_FALLBACK_COLUMNS);

  const selectColumns = ["id", "is_superadmin"];
  if (emailColumn) {
    selectColumns.push(emailColumn);
  }
  if (createdColumn) {
    selectColumns.push(createdColumn);
  }

  let query = supabase.from("profiles").select(selectColumns.join(", "));
  if (createdColumn) {
    query = query.order(createdColumn, { ascending: false });
  }

  const { data, error } = await query.limit(500);
  const profiles = data as Record<string, unknown>[] | null;
  const showEmail = Boolean(emailColumn);
  const showCreated = Boolean(createdColumn);
  const colSpan = 2 + (showEmail ? 1 : 0) + (showCreated ? 1 : 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Profiles</h1>
      <p className="mt-1 text-sm text-zinc-600">Read-only list of users from staging.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Superadmin</th>
              {showEmail ? <th className="px-4 py-3">Email</th> : null}
              {showCreated ? <th className="px-4 py-3">Created</th> : null}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td className="px-4 py-4 text-red-600" colSpan={colSpan}>
                  Failed to load profiles: {error.message}
                </td>
              </tr>
            ) : profiles && profiles.length > 0 ? (
              profiles.map((profile) => {
                const id = String(profile.id ?? "");
                const isSuperadmin = Boolean(profile.is_superadmin);
                const emailValue = showEmail ? String(profile[emailColumn as string] ?? "-") : null;
                const createdValue = showCreated ? profile[createdColumn as string] : null;

                return (
                  <tr key={id} className="border-t border-zinc-100 text-zinc-700">
                    <td className="px-4 py-3 font-mono text-xs">{id || "-"}</td>
                    <td className="px-4 py-3">{isSuperadmin ? "Yes" : "No"}</td>
                    {showEmail ? <td className="px-4 py-3">{emailValue}</td> : null}
                    {showCreated ? (
                      <td className="px-4 py-3">{createdValue ? new Date(String(createdValue)).toLocaleString() : "-"}</td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={colSpan}>
                  No profiles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
