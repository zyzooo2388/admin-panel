import TermsCrudTableClient from "@/components/admin/TermsCrudTableClient";
import { deleteResourceRowAction, updateResourceRowAction } from "@/app/admin/(protected)/_actions/resourceCrudActions";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { loadAdminResource, resolveTableName } from "@/lib/admin/resourceData";
import { pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

async function loadTermTypeLabels(supabase: SupabaseClient) {
  const tableResult = await resolveTableName(supabase, ["term_types", "term_type", "termTypes"]);

  if (!tableResult.tableName) {
    return {} as Record<string, string>;
  }

  const labelColumn = await pickFirstWorkingColumn(supabase, tableResult.tableName, ["name", "label", "type", "term_type"], "id");
  if (!labelColumn) {
    return {} as Record<string, string>;
  }

  const { data, error } = await supabase.from(tableResult.tableName).select(`id, ${labelColumn}`).limit(500);
  if (error || !data) {
    return {} as Record<string, string>;
  }

  const labels: Record<string, string> = {};

  for (const row of data as Record<string, unknown>[]) {
    const id = row.id;
    const labelValue = row[labelColumn];

    if ((typeof id !== "string" && typeof id !== "number") || (typeof labelValue !== "string" && typeof labelValue !== "number")) {
      continue;
    }

    labels[String(id)] = String(labelValue);
  }

  return labels;
}

export default async function TermsPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [resource, termTypeLabels, orderedTermsResult] = await Promise.all([
    loadAdminResource(supabase, "terms", 500),
    loadTermTypeLabels(supabase),
    supabase.from("terms").select("*").order("created_datetime_utc", { ascending: false }).limit(500),
  ]);

  const orderedRows = orderedTermsResult.error
    ? resource.rows
    : (((orderedTermsResult.data as unknown) as Record<string, unknown>[] | null) ?? resource.rows);
  const errorMessage = params.error ?? resource.error ?? (orderedTermsResult.error ? `Failed to load terms: ${orderedTermsResult.error.message}` : null);

  return (
    <TermsCrudTableClient
      title={resource.config.title}
      description={resource.config.description}
      mode={resource.config.mode}
      resourceKey={resource.config.key}
      redirectPath="/admin/terms"
      rows={orderedRows}
      editableColumns={resource.editableColumns}
      idColumn={resource.idColumn}
      columnKinds={resource.columnKinds}
      errorMessage={errorMessage}
      successMessage={params.success ?? null}
      updateAction={updateResourceRowAction}
      deleteAction={deleteResourceRowAction}
      requiredColumns={resource.config.requiredColumns}
      termTypeLabels={termTypeLabels}
    />
  );
}
