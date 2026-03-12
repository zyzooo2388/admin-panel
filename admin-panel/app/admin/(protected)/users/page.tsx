import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import UsersPageClient from "./UsersPageClient";

type ProfileRow = {
  id: string;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean | null;
  is_in_study: boolean | null;
  is_matrix_admin: boolean | null;
};

const ROW_LIMIT = 500;

export default async function UsersPage() {
  await requireSuperadmin();

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("profiles")
    .select(
      "id, created_datetime_utc, modified_datetime_utc, first_name, last_name, email, is_superadmin, is_in_study, is_matrix_admin",
      { count: "exact" },
    )
    .order("created_datetime_utc", { ascending: false, nullsFirst: false })
    .limit(ROW_LIMIT);

  const rows: ProfileRow[] = (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    created_datetime_utc: typeof row.created_datetime_utc === "string" ? row.created_datetime_utc : null,
    modified_datetime_utc: typeof row.modified_datetime_utc === "string" ? row.modified_datetime_utc : null,
    first_name: typeof row.first_name === "string" ? row.first_name : null,
    last_name: typeof row.last_name === "string" ? row.last_name : null,
    email: typeof row.email === "string" ? row.email : null,
    is_superadmin: typeof row.is_superadmin === "boolean" ? row.is_superadmin : null,
    is_in_study: typeof row.is_in_study === "boolean" ? row.is_in_study : null,
    is_matrix_admin: typeof row.is_matrix_admin === "boolean" ? row.is_matrix_admin : null,
  }));

  return <UsersPageClient rows={rows} errorMessage={error?.message ?? null} totalCount={count ?? null} rowLimit={ROW_LIMIT} />;
}
