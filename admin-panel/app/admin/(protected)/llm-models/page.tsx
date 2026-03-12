import AdminCrudTableClient from "@/components/admin/AdminCrudTableClient";
import { createResourceRowAction, deleteResourceRowAction, updateResourceRowAction } from "@/app/admin/(protected)/_actions/resourceCrudActions";
import { pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { loadAdminResource, resolveTableName, type ColumnKind } from "@/lib/admin/resourceData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type ProviderOption = {
  value: string;
  label: string;
};

function stringifyProviderId(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function isNumericValue(value: unknown) {
  return typeof value === "number" || (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Number(value)));
}

async function loadProviderOptions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<{
  options: ProviderOption[];
  labelsById: Record<string, string>;
  idKind: ColumnKind;
}> {
  const tableResult = await resolveTableName(supabase, ["llm_providers", "llmProviders"]);
  if (!tableResult.tableName) {
    return { options: [], labelsById: {}, idKind: "string" };
  }

  const labelColumn =
    (await pickFirstWorkingColumn(supabase, tableResult.tableName, ["name", "display_name", "label", "provider_name", "slug"], "id")) ?? null;

  const selectColumns = labelColumn ? `id, ${labelColumn}` : "id";
  const { data, error } = await supabase.from(tableResult.tableName).select(selectColumns).limit(500).order("id", { ascending: true });

  if (error || !data) {
    return { options: [], labelsById: {}, idKind: "string" };
  }

  const options: ProviderOption[] = [];
  const labelsById: Record<string, string> = {};
  let idKind: ColumnKind = "string";

  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;
    const rawId = row.id;
    const value = stringifyProviderId(rawId);
    if (!value) {
      continue;
    }

    if (isNumericValue(rawId)) {
      idKind = "number";
    }

    const labelValue = labelColumn ? row[labelColumn] : null;
    const label = typeof labelValue === "string" && labelValue.trim().length > 0 ? labelValue.trim() : value;

    options.push({ value, label });
    labelsById[value] = label;
  }

  return { options, labelsById, idKind };
}

export default async function LlmModelsPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const resource = await loadAdminResource(supabase, "llm-models", 500);
  const providers = await loadProviderOptions(supabase);

  const rows = resource.rows.map((row) => {
    const providerId = stringifyProviderId(row.llm_provider_id);

    return {
      ...row,
      provider: providers.labelsById[providerId] ?? (providerId || null),
    };
  });

  const displayColumns = ["id", "name", "provider", "provider_model_id", "is_temperature_supported"];
  const columnKinds = {
    ...resource.columnKinds,
    llm_provider_id: providers.idKind,
    provider_model_id: "string" as const,
    is_temperature_supported: "boolean" as const,
  };
  const editableColumns = ["name", "llm_provider_id", "provider_model_id", "is_temperature_supported"];

  return (
    <AdminCrudTableClient
      title={resource.config.title}
      description={resource.config.description}
      mode={resource.config.mode}
      resourceKey={resource.config.key}
      redirectPath="/admin/llm-models"
      rows={rows}
      displayColumns={displayColumns.length > 0 ? displayColumns : ["id", "name", "provider"]}
      editableColumns={editableColumns}
      idColumn={resource.idColumn}
      columnKinds={columnKinds}
      errorMessage={params.error ?? resource.error}
      successMessage={params.success ?? null}
      createAction={createResourceRowAction}
      updateAction={updateResourceRowAction}
      deleteAction={deleteResourceRowAction}
      columnLabels={{
        id: "ID",
        name: "Name",
        provider: "Provider",
        llm_provider_id: "Provider",
        provider_model_id: "Provider Model ID",
        is_temperature_supported: "Temperature Supported",
      }}
      fieldOptions={{
        llm_provider_id: providers.options,
      }}
      requiredColumns={["name", "llm_provider_id", "provider_model_id"]}
      createFieldDefaults={{ is_temperature_supported: false }}
    />
  );
}
