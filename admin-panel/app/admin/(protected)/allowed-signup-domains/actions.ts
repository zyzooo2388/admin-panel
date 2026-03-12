"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AllowedSignupDomainRow = {
  id: string | number;
  created_datetime_utc: string | null;
  apex_domain: string | null;
};

const APEX_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

function normalizeApexDomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateApexDomain(value: string) {
  if (!value) {
    return "Apex domain is required.";
  }
  if (!APEX_DOMAIN_PATTERN.test(value)) {
    return "Apex domain looks invalid. Example: columbia.edu";
  }

  return null;
}

function toRow(data: Record<string, unknown> | null): AllowedSignupDomainRow {
  return {
    id: data?.id as string | number,
    created_datetime_utc: (data?.created_datetime_utc as string | null) ?? null,
    apex_domain: (data?.apex_domain as string | null) ?? null,
  };
}

export async function createAllowedSignupDomainInlineAction(input: { apexDomain: string }) {
  await requireSuperadmin();

  const apexDomain = normalizeApexDomain(input?.apexDomain);
  const validationError = validateApexDomain(apexDomain);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("allowed_signup_domains")
    .insert({ apex_domain: apexDomain })
    .select("id, created_datetime_utc, apex_domain")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to create domain: ${result.error.message}` };
  }

  revalidatePath("/admin/allowed-signup-domains");
  return { ok: true as const, row: toRow(result.data) };
}

export async function updateAllowedSignupDomainInlineAction(input: { id: string; apexDomain: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  const apexDomain = normalizeApexDomain(input?.apexDomain);

  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const validationError = validateApexDomain(apexDomain);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("allowed_signup_domains")
    .update({ apex_domain: apexDomain })
    .eq("id", id)
    .select("id, created_datetime_utc, apex_domain")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to update domain: ${result.error.message}` };
  }

  revalidatePath("/admin/allowed-signup-domains");
  return { ok: true as const, row: toRow(result.data) };
}

export async function deleteAllowedSignupDomainInlineAction(input: { id: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("allowed_signup_domains").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: `Failed to delete domain: ${error.message}` };
  }

  revalidatePath("/admin/allowed-signup-domains");
  return { ok: true as const };
}
