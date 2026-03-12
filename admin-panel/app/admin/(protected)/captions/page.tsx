import CaptionsTableClient, { type CaptionRow } from "./CaptionsTableClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export default async function CaptionsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error, count } = await supabase
    .from("captions")
    .select(
      "id, created_datetime_utc, modified_datetime_utc, content, is_public, profile_id, image_id, humor_flavor_id, is_featured, caption_request_id, like_count, llm_prompt_chain_id",
      { count: "estimated" },
    )
    .order("created_datetime_utc", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);

  const rows: CaptionRow[] = (data ?? []).map((row) => ({
    id: row.id === null || row.id === undefined ? null : String(row.id),
    created_datetime_utc: typeof row.created_datetime_utc === "string" ? row.created_datetime_utc : null,
    modified_datetime_utc: typeof row.modified_datetime_utc === "string" ? row.modified_datetime_utc : null,
    content: typeof row.content === "string" ? row.content : null,
    is_public: typeof row.is_public === "boolean" ? row.is_public : null,
    profile_id: row.profile_id === null || row.profile_id === undefined ? null : String(row.profile_id),
    image_id: row.image_id === null || row.image_id === undefined ? null : String(row.image_id),
    humor_flavor_id: row.humor_flavor_id === null || row.humor_flavor_id === undefined ? null : String(row.humor_flavor_id),
    is_featured: typeof row.is_featured === "boolean" ? row.is_featured : null,
    caption_request_id: row.caption_request_id === null || row.caption_request_id === undefined ? null : String(row.caption_request_id),
    like_count: toNullableNumber(row.like_count),
    llm_prompt_chain_id:
      row.llm_prompt_chain_id === null || row.llm_prompt_chain_id === undefined ? null : String(row.llm_prompt_chain_id),
  }));

  const humorFlavorIds = [...new Set(rows.map((row) => row.humor_flavor_id).filter((value): value is string => Boolean(value)))];

  let humorFlavorMap: Record<string, string> = {};
  if (humorFlavorIds.length > 0) {
    const { data: humorFlavorData } = await supabase.from("humor_flavors").select("id, slug, name").in("id", humorFlavorIds);

    humorFlavorMap = Object.fromEntries(
      (humorFlavorData ?? [])
        .map((row) => {
          const id = row.id === null || row.id === undefined ? null : String(row.id);
          if (!id) {
            return null;
          }

          const slug = typeof row.slug === "string" ? row.slug : null;
          const name = typeof row.name === "string" ? row.name : null;
          return [id, slug || name || `Flavor #${id}`];
        })
        .filter((entry): entry is [string, string] => Array.isArray(entry)),
    );
  }

  return (
    <CaptionsTableClient
      rows={rows}
      errorMessage={error?.message ?? null}
      totalCount={typeof count === "number" ? count : null}
      humorFlavorMap={humorFlavorMap}
    />
  );
}
