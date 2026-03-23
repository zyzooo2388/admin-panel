"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { getResourceConfig, resolveTableName, type ColumnKind } from "@/lib/admin/resourceData";
import type { AdminResourceKey } from "@/lib/admin/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CrudStatus = "error" | "success";

type ParsedPayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; message: string };

function toPath(path: string, status: CrudStatus, message: string) {
  const params = new URLSearchParams({ [status]: message });
  return `${path}?${params.toString()}`;
}

function normalizeString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeResourceKey(value: FormDataEntryValue | null): AdminResourceKey | null {
  const key = normalizeString(value);
  if (!key) {
    return null;
  }

  return key as AdminResourceKey;
}

function getSafeColumns(columnsRaw: string): string[] {
  try {
    const parsed = JSON.parse(columnsRaw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((column): column is string => typeof column === "string")
      .filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column));
  } catch {
    return [];
  }
}

function validateRequiredFields(payload: Record<string, unknown>, requiredColumns: string[]): string | null {
  for (const column of requiredColumns) {
    const value = payload[column];

    if (typeof value === "string" && value.trim().length === 0) {
      return `${column} is required.`;
    }

    if (value === null || value === undefined) {
      return `${column} is required.`;
    }
  }

  return null;
}

function getFieldKinds(kindsRaw: string): Record<string, ColumnKind> {
  try {
    const parsed = JSON.parse(kindsRaw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const result: Record<string, ColumnKind> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        continue;
      }
      if (value === "string" || value === "number" || value === "boolean" || value === "json") {
        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

function parseFieldValue(raw: string, kind: ColumnKind): { ok: true; value: unknown } | { ok: false; message: string } {
  if (raw.length === 0) {
    return { ok: true, value: null };
  }

  if (kind === "number") {
    const numberValue = Number(raw);
    if (Number.isNaN(numberValue)) {
      return { ok: false, message: `Invalid number: ${raw}` };
    }
    return { ok: true, value: numberValue };
  }

  if (kind === "boolean") {
    if (raw === "true") {
      return { ok: true, value: true };
    }
    if (raw === "false") {
      return { ok: true, value: false };
    }
    return { ok: false, message: `Invalid boolean: ${raw}` };
  }

  if (kind === "json") {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, message: "Invalid JSON value." };
    }
  }

  return { ok: true, value: raw };
}

function parsePayload(formData: FormData, columns: string[], fieldKinds: Record<string, ColumnKind>): ParsedPayloadResult {
  const payload: Record<string, unknown> = {};

  for (const column of columns) {
    const raw = normalizeString(formData.get(`field:${column}`));
    const parsed = parseFieldValue(raw, fieldKinds[column] ?? "string");

    if (!parsed.ok) {
      return { ok: false, message: `${column}: ${parsed.message}` };
    }

    payload[column] = parsed.value;
  }

  return { ok: true, payload };
}

function normalizeCaptionExamplesPayload(
  payload: Record<string, unknown>,
  options?: { isCreate?: boolean },
): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
  const nextPayload = { ...payload };
  const priorityValue = nextPayload.priority;

  if (priorityValue === null || priorityValue === undefined || priorityValue === "") {
    if (options?.isCreate) {
      nextPayload.priority = 0;
    }
  } else if (typeof priorityValue !== "number" || !Number.isInteger(priorityValue)) {
    return { ok: false, message: "priority must be a valid integer." };
  }

  if (nextPayload.image_id === null || nextPayload.image_id === undefined || nextPayload.image_id === "") {
    delete nextPayload.image_id;
  } else if (typeof nextPayload.image_id === "string") {
    const imageId = nextPayload.image_id.trim();

    if (imageId.length === 0) {
      delete nextPayload.image_id;
    } else if (!isUuid(imageId)) {
      return { ok: false, message: "image_id must be a valid UUID or left blank." };
    } else {
      nextPayload.image_id = imageId;
    }
  } else {
    return { ok: false, message: "image_id must be a valid UUID or left blank." };
  }

  return { ok: true, payload: nextPayload };
}

function normalizeLlmModelsPayload(payload: Record<string, unknown>): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
  const nextPayload = { ...payload };

  if (nextPayload.is_temperature_supported === null || nextPayload.is_temperature_supported === undefined || nextPayload.is_temperature_supported === "") {
    nextPayload.is_temperature_supported = false;
  } else if (typeof nextPayload.is_temperature_supported !== "boolean") {
    return { ok: false, message: "is_temperature_supported must be true or false." };
  }

  return { ok: true, payload: nextPayload };
}

async function resolveCrudContext(formData: FormData) {
  const redirectPath = normalizeString(formData.get("redirect_path")) || "/admin";
  const resourceKey = normalizeResourceKey(formData.get("resource_key"));

  if (!resourceKey) {
    redirect(toPath(redirectPath, "error", "Missing resource key."));
  }

  const config = getResourceConfig(resourceKey);
  const supabase = await createSupabaseServerClient();
  const tableResult = await resolveTableName(supabase, config.tableCandidates);

  if (!tableResult.tableName) {
    redirect(toPath(redirectPath, "error", tableResult.error ?? "Unable to resolve table."));
  }

  return {
    redirectPath,
    resourceKey,
    config,
    tableName: tableResult.tableName,
    supabase,
  };
}

export async function createResourceRowAction(formData: FormData) {
  const auth = await requireSuperadmin();

  const { redirectPath, config, tableName, supabase } = await resolveCrudContext(formData);
  if (config.mode !== "crud") {
    redirect(toPath(redirectPath, "error", `Create is not allowed for ${config.title}.`));
  }
  const columns = getSafeColumns(normalizeString(formData.get("editable_columns")));
  const kinds = getFieldKinds(normalizeString(formData.get("field_kinds")));

  if (columns.length === 0) {
    redirect(toPath(redirectPath, "error", "No editable columns were found for create."));
  }

  const parsedPayload = parsePayload(formData, columns, kinds);
  if (!parsedPayload.ok) {
    redirect(toPath(redirectPath, "error", `Failed to create ${config.title}: ${parsedPayload.message}`));
  }

  const normalizedPayloadResult =
    config.key === "caption-examples"
      ? normalizeCaptionExamplesPayload(parsedPayload.payload, { isCreate: true })
      : config.key === "llm-models"
        ? normalizeLlmModelsPayload(parsedPayload.payload)
      : ({ ok: true, payload: parsedPayload.payload } as const);

  if (!normalizedPayloadResult.ok) {
    redirect(toPath(redirectPath, "error", `Failed to create ${config.title}: ${normalizedPayloadResult.message}`));
  }

  const requiredFieldError = validateRequiredFields(normalizedPayloadResult.payload, config.requiredColumns ?? []);
  if (requiredFieldError) {
    redirect(toPath(redirectPath, "error", `Failed to create ${config.title}: ${requiredFieldError}`));
  }

  const payloadWithAudit = {
    ...normalizedPayloadResult.payload,
    created_by_user_id: auth.user.id,
    modified_by_user_id: auth.user.id,
  };

  const { error } = await supabase.from(tableName).insert(payloadWithAudit);
  if (error) {
    redirect(toPath(redirectPath, "error", `Failed to create ${config.title}: ${error.message}`));
  }

  revalidatePath(redirectPath);
  redirect(toPath(redirectPath, "success", `${config.title} record created.`));
}

export async function updateResourceRowAction(formData: FormData) {
  const auth = await requireSuperadmin();

  const { redirectPath, config, tableName, supabase } = await resolveCrudContext(formData);
  if (config.mode === "read") {
    redirect(toPath(redirectPath, "error", `Update is not allowed for ${config.title}.`));
  }

  const rowId = normalizeString(formData.get("row_id"));
  const idColumn = normalizeString(formData.get("id_column")) || "id";
  const columns = getSafeColumns(normalizeString(formData.get("editable_columns")));
  const kinds = getFieldKinds(normalizeString(formData.get("field_kinds")));

  if (!rowId) {
    redirect(toPath(redirectPath, "error", "Missing row identifier."));
  }
  if (columns.length === 0) {
    redirect(toPath(redirectPath, "error", "No editable columns were found for update."));
  }

  const parsedPayload = parsePayload(formData, columns, kinds);
  if (!parsedPayload.ok) {
    redirect(toPath(redirectPath, "error", `Failed to update ${config.title}: ${parsedPayload.message}`));
  }

  const normalizedPayloadResult =
    config.key === "caption-examples"
      ? normalizeCaptionExamplesPayload(parsedPayload.payload)
      : config.key === "llm-models"
        ? normalizeLlmModelsPayload(parsedPayload.payload)
      : ({ ok: true, payload: parsedPayload.payload } as const);

  if (!normalizedPayloadResult.ok) {
    redirect(toPath(redirectPath, "error", `Failed to update ${config.title}: ${normalizedPayloadResult.message}`));
  }

  const requiredFieldError = validateRequiredFields(normalizedPayloadResult.payload, config.requiredColumns ?? []);
  if (requiredFieldError) {
    redirect(toPath(redirectPath, "error", `Failed to update ${config.title}: ${requiredFieldError}`));
  }

  const payloadWithAudit = {
    ...normalizedPayloadResult.payload,
    modified_by_user_id: auth.user.id,
  };

  const { error } = await supabase.from(tableName).update(payloadWithAudit).eq(idColumn, rowId);
  if (error) {
    redirect(toPath(redirectPath, "error", `Failed to update ${config.title}: ${error.message}`));
  }

  revalidatePath(redirectPath);
  redirect(toPath(redirectPath, "success", `${config.title} record updated.`));
}

export async function deleteResourceRowAction(formData: FormData) {
  await requireSuperadmin();

  const { redirectPath, config, tableName, supabase } = await resolveCrudContext(formData);
  if (config.mode !== "crud") {
    redirect(toPath(redirectPath, "error", `Delete is not allowed for ${config.title}.`));
  }

  const rowId = normalizeString(formData.get("row_id"));
  const idColumn = normalizeString(formData.get("id_column")) || "id";

  if (!rowId) {
    redirect(toPath(redirectPath, "error", "Missing row identifier."));
  }

  const { error } = await supabase.from(tableName).delete().eq(idColumn, rowId);
  if (error) {
    redirect(toPath(redirectPath, "error", `Failed to delete ${config.title}: ${error.message}`));
  }

  revalidatePath(redirectPath);
  redirect(toPath(redirectPath, "success", `${config.title} record deleted.`));
}
