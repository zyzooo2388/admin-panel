import HumorFlavorStepsTableClient, { type HumorFlavorStepRow, type LookupMaps } from "./HumorFlavorStepsTableClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbRow = Record<string, unknown>;

function toIdValue(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function idKey(id: number | string) {
  return String(id);
}

function isRecord(value: unknown): value is DbRow {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(row: DbRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

async function loadLookupLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tableName: string,
  ids: Array<number | string>,
  labelKeys: string[],
  fallbackPrefix: string,
) {
  if (ids.length === 0) {
    return {} as Record<string, string>;
  }

  const { data, error } = await supabase.from(tableName).select("*").in("id", ids);
  if (error || !data) {
    return {} as Record<string, string>;
  }

  const labelMap: Record<string, string> = {};
  for (const row of data) {
    if (!isRecord(row)) {
      continue;
    }
    const id = toIdValue(row.id);
    if (id === null) {
      continue;
    }
    const label = firstString(row, labelKeys) ?? `${fallbackPrefix} #${id}`;
    labelMap[idKey(id)] = label;
  }

  return labelMap;
}

function collectDistinctIds(rows: HumorFlavorStepRow[], key: keyof HumorFlavorStepRow): Array<number | string> {
  const seen = new Set<string>();
  const values: Array<number | string> = [];

  for (const row of rows) {
    const value = row[key];
    if (typeof value !== "number" && typeof value !== "string") {
      continue;
    }
    const keyValue = idKey(value);
    if (seen.has(keyValue)) {
      continue;
    }
    seen.add(keyValue);
    values.push(value);
  }

  return values;
}

export default async function HumorFlavorStepsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select(
      "id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, description",
    )
    .order("humor_flavor_id", { ascending: true })
    .order("order_by", { ascending: true })
    .order("id", { ascending: true })
    .limit(5000);

  const rows: HumorFlavorStepRow[] = (data ?? []).map((row) => ({
    id: toIdValue(row.id),
    created_datetime_utc: toOptionalString(row.created_datetime_utc),
    humor_flavor_id: toIdValue(row.humor_flavor_id),
    llm_temperature: toOptionalNumber(row.llm_temperature),
    order_by: toOptionalNumber(row.order_by),
    llm_input_type_id: toIdValue(row.llm_input_type_id),
    llm_output_type_id: toIdValue(row.llm_output_type_id),
    llm_model_id: toIdValue(row.llm_model_id),
    humor_flavor_step_type_id: toIdValue(row.humor_flavor_step_type_id),
    llm_system_prompt: toOptionalString(row.llm_system_prompt),
    llm_user_prompt: toOptionalString(row.llm_user_prompt),
    description: toOptionalString(row.description),
  }));

  const flavorIds = collectDistinctIds(rows, "humor_flavor_id");
  const modelIds = collectDistinctIds(rows, "llm_model_id");
  const inputTypeIds = collectDistinctIds(rows, "llm_input_type_id");
  const outputTypeIds = collectDistinctIds(rows, "llm_output_type_id");
  const stepTypeIds = collectDistinctIds(rows, "humor_flavor_step_type_id");

  const [flavorLabels, modelLabels, inputTypeLabels, outputTypeLabels, stepTypeLabels] = await Promise.all([
    loadLookupLabels(supabase, "humor_flavors", flavorIds, ["name", "slug", "description"], "Flavor"),
    loadLookupLabels(supabase, "llm_models", modelIds, ["name", "provider_model_id"], "Model"),
    loadLookupLabels(supabase, "llm_input_types", inputTypeIds, ["name", "slug", "description"], "Input Type"),
    loadLookupLabels(supabase, "llm_output_types", outputTypeIds, ["name", "slug", "description"], "Output Type"),
    loadLookupLabels(
      supabase,
      "humor_flavor_step_types",
      stepTypeIds,
      ["name", "slug", "description", "label"],
      "Type",
    ),
  ]);

  const lookups: LookupMaps = {
    flavorLabels,
    modelLabels,
    inputTypeLabels,
    outputTypeLabels,
    stepTypeLabels,
  };

  return (
    <HumorFlavorStepsTableClient rows={rows} lookups={lookups} errorMessage={error?.message ?? null} />
  );
}
