"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LlmProviderRow = {
  id: string | number;
  created_datetime_utc: string | null;
  name: string | null;
};

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateName(value: string) {
  if (!value) {
    return "Name is required.";
  }

  return null;
}

function toRow(data: Record<string, unknown> | null): LlmProviderRow {
  return {
    id: data?.id as string | number,
    created_datetime_utc: (data?.created_datetime_utc as string | null) ?? null,
    name: (data?.name as string | null) ?? null,
  };
}

export async function createLlmProviderInlineAction(input: { name: string }) {
  await requireSuperadmin();

  const name = normalizeName(input?.name);
  const validationError = validateName(name);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("llm_providers")
    .insert({ name })
    .select("id, created_datetime_utc, name")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to create provider: ${result.error.message}` };
  }

  revalidatePath("/admin/llm-providers");
  return { ok: true as const, row: toRow(result.data) };
}

export async function updateLlmProviderInlineAction(input: { id: string; name: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  const name = normalizeName(input?.name);
  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const validationError = validateName(name);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("llm_providers")
    .update({ name })
    .eq("id", id)
    .select("id, created_datetime_utc, name")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to update provider: ${result.error.message}` };
  }

  revalidatePath("/admin/llm-providers");
  return { ok: true as const, row: toRow(result.data) };
}

export async function deleteLlmProviderInlineAction(input: { id: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("llm_providers").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: `Failed to delete provider: ${error.message}` };
  }

  revalidatePath("/admin/llm-providers");
  return { ok: true as const };
}
