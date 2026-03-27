import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export const CREATED_TIMESTAMP_FALLBACK_COLUMNS = [
  "created_datetime_utc",
  "created_at",
  "createdAt",
  "inserted_at",
  "timestamp",
  "created",
  "modified_datetime_utc",
  "updated_at",
] as const;
export const CAPTION_TEXT_FALLBACK_COLUMNS = ["text", "caption", "content", "body", "caption_text"] as const;
export const IMAGE_URL_FALLBACK_COLUMNS = ["url", "image_url", "path", "src"] as const;

type PickFirstWorkingSelectResult = {
  select: string | null;
  error: PostgrestError | null;
};

export async function pickFirstWorkingSelect(
  supabase: SupabaseClient,
  tableName: string,
  selectCandidates: string[],
): Promise<PickFirstWorkingSelectResult> {
  let lastError: PostgrestError | null = null;

  for (const select of selectCandidates) {
    const { error } = await supabase.from(tableName).select(select).limit(1);
    if (!error) {
      return { select, error: null };
    }

    lastError = error;
  }

  return { select: null, error: lastError };
}

export async function pickFirstWorkingColumn(
  supabase: SupabaseClient,
  tableName: string,
  columnCandidates: readonly string[],
  probeColumn = "id",
): Promise<string | null> {
  const selectCandidates = columnCandidates.map((columnName) => `${probeColumn}, ${columnName}`);
  const result = await pickFirstWorkingSelect(supabase, tableName, selectCandidates);

  if (!result.select) {
    return null;
  }

  const match = columnCandidates.find((columnName) => result.select?.endsWith(`, ${columnName}`));
  return match ?? null;
}
