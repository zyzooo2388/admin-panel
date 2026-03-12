import AdminReadOnlyTableClient from "@/components/admin/AdminReadOnlyTableClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { loadAdminResource } from "@/lib/admin/resourceData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LlmPromptChainsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const rowLimit = 500;
  const resource = await loadAdminResource(supabase, "llm-prompt-chains", rowLimit);
  const columns = ["id", "created_datetime_utc", "caption_request_id"];

  return (
    <AdminReadOnlyTableClient
      title={resource.config.title}
      description={resource.config.description}
      rows={resource.rows}
      columns={columns}
      errorMessage={resource.error}
      columnLabels={{
        id: "ID",
        created_datetime_utc: "Created At",
        caption_request_id: "Caption Request ID",
      }}
      searchColumns={["id", "caption_request_id"]}
      utcDateColumns={["created_datetime_utc"]}
      monospaceColumns={["id", "caption_request_id"]}
      chipColumns={["caption_request_id"]}
      stickyHeader
      rowLimit={rowLimit}
      showStatsBar
      searchPlaceholder="Search by ID or caption request ID..."
    />
  );
}
