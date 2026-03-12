import LlmProvidersPageClient from "./LlmProvidersPageClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type LlmProviderRow = {
  id: string | number;
  created_datetime_utc: string | null;
  name: string | null;
};

export default async function LlmProvidersPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("llm_providers")
    .select("id, created_datetime_utc, name")
    .order("created_datetime_utc", { ascending: false })
    .limit(500);
  const initialRows = (data ?? []) as LlmProviderRow[];

  return (
    <LlmProvidersPageClient
      initialRows={initialRows}
      initialError={params.error ?? (error ? `Failed to load LLM providers: ${error.message}` : null)}
      initialSuccess={params.success ?? null}
    />
  );
}
