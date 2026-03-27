import HumorMixPageClient, { type HumorFlavorOption, type HumorMixRow } from "./HumorMixPageClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { loadAdminResource } from "@/lib/admin/resourceData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toRow(record: Record<string, unknown>): HumorMixRow | null {
  const id = toNumber(record.id);
  const humorFlavorId = toNumber(record.humor_flavor_id);
  const captionCount = toNumber(record.caption_count);

  if (id === null || humorFlavorId === null || captionCount === null) {
    return null;
  }

  return {
    id,
    created_datetime_utc: typeof record.created_datetime_utc === "string" ? record.created_datetime_utc : null,
    humor_flavor_id: humorFlavorId,
    caption_count: captionCount,
  };
}

export default async function HumorMixPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const resource = await loadAdminResource(supabase, "humor-mix", 500);
  const rows = resource.rows.map(toRow).filter((row): row is HumorMixRow => row !== null);
  const { data, error: humorFlavorsError } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("id", { ascending: true });

  if (humorFlavorsError) {
    console.error("Failed to load humor flavor options for Humor Mix.", humorFlavorsError);
  }

  const humorFlavorOptions: HumorFlavorOption[] =
    data
      ?.map((row) => {
        const id = toNumber(row.id);
        if (id === null) {
          return null;
        }
        const slug = typeof row.slug === "string" && row.slug.trim() ? row.slug.trim() : null;
        const description = typeof row.description === "string" && row.description.trim() ? row.description.trim() : null;
        return { id, slug, description };
      })
      .filter((row): row is HumorFlavorOption => row !== null) ?? [];

  return (
    <HumorMixPageClient
      title={resource.config.title}
      description={resource.config.description}
      rows={rows}
      humorFlavors={humorFlavorOptions}
      humorFlavorsError={humorFlavorsError?.message ?? null}
      errorMessage={params.error ?? resource.error}
      successMessage={params.success ?? null}
      emptyStateMessage="No humor mix rows yet. Add a row in Supabase to configure humor flavor mix values."
    />
  );
}
