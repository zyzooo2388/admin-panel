import LlmResponsesTableClient from "./LlmResponsesTableClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LlmResponsesPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("llm_model_responses")
    .select("id, created_datetime_utc, llm_model_response, processing_time_seconds, llm_model_id")
    .order("created_datetime_utc", { ascending: false })
    .limit(500);

  return <LlmResponsesTableClient rows={data ?? []} errorMessage={error?.message ?? null} />;
}
