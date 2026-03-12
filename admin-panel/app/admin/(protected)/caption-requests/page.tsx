import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import CaptionRequestsTableClient, { type CaptionRequestRow } from "./CaptionRequestsTableClient";

const ROW_LIMIT = 500;

function startOfTodayUtcIso() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
}

export default async function CaptionRequestsPage() {
  await requireSuperadmin();

  const supabase = await createSupabaseServerClient();

  const [{ data, error, count }, emailColumn] = await Promise.all([
    supabase
      .from("caption_requests")
      .select("id, created_datetime_utc, profile_id, image_id", { count: "estimated" })
      .order("created_datetime_utc", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(ROW_LIMIT),
    pickFirstWorkingColumn(supabase, "profiles", ["email"]),
  ]);

  const rowsWithoutEmails: CaptionRequestRow[] = (data ?? []).map((row) => ({
    id: row.id === null || row.id === undefined ? null : String(row.id),
    created_datetime_utc: typeof row.created_datetime_utc === "string" ? row.created_datetime_utc : null,
    profile_id: row.profile_id === null || row.profile_id === undefined ? null : String(row.profile_id),
    image_id: row.image_id === null || row.image_id === undefined ? null : String(row.image_id),
    user_email: null,
  }));

  const profileIds = [...new Set(rowsWithoutEmails.map((row) => row.profile_id).filter((value): value is string => Boolean(value)))];

  let emailByProfileId = new Map<string, string>();
  if (emailColumn && profileIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select(`id, ${emailColumn}`).in("id", profileIds);

    emailByProfileId = new Map(
      ((profileRows as Array<Record<string, unknown>> | null) ?? [])
        .map((row) => {
          const id = row.id === null || row.id === undefined ? null : String(row.id);
          const email = typeof row[emailColumn] === "string" ? row[emailColumn] : null;

          if (!id || !email) {
            return null;
          }

          return [id, email] as const;
        })
        .filter((entry): entry is readonly [string, string] => Array.isArray(entry)),
    );
  }

  const rows: CaptionRequestRow[] = rowsWithoutEmails.map((row) => ({
    ...row,
    user_email: row.profile_id ? emailByProfileId.get(row.profile_id) ?? null : null,
  }));

  const requestsTodayPromise = error
    ? Promise.resolve({ count: null })
    : supabase
        .from("caption_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_datetime_utc", startOfTodayUtcIso());

  const { count: requestsTodayCount } = await requestsTodayPromise;

  return (
    <CaptionRequestsTableClient
      rows={rows}
      errorMessage={error?.message ?? null}
      totalCount={typeof count === "number" ? count : null}
      requestsTodayCount={typeof requestsTodayCount === "number" ? requestsTodayCount : null}
      rowLimit={ROW_LIMIT}
    />
  );
}
