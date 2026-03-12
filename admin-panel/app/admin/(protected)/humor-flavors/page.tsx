import HumorFlavorsTableClient from "./HumorFlavorsTableClient";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HumorFlavorRow = {
  id: number | string | null;
  slug: string | null;
  description: string | null;
  created_datetime_utc: string | null;
};

export default async function HumorFlavorsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("id, slug, description, created_datetime_utc")
    .limit(5000);

  const rows: HumorFlavorRow[] = (data ?? []).map((row) => ({
    id: typeof row.id === "number" || typeof row.id === "string" ? row.id : null,
    slug: typeof row.slug === "string" ? row.slug : null,
    description: typeof row.description === "string" ? row.description : null,
    created_datetime_utc: typeof row.created_datetime_utc === "string" ? row.created_datetime_utc : null,
  }));

  return <HumorFlavorsTableClient rows={rows} errorMessage={error?.message ?? null} />;
}
