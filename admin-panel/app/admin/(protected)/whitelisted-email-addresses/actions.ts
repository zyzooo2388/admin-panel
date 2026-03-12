"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WhitelistedEmailAddressRow = {
  id: string | number;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  email_address: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateEmailAddress(value: string) {
  if (!value) {
    return "Email address is required.";
  }

  if (!EMAIL_PATTERN.test(value)) {
    return "Email address looks invalid. Example: name@example.com";
  }

  return null;
}

function toRow(data: Record<string, unknown> | null): WhitelistedEmailAddressRow {
  return {
    id: data?.id as string | number,
    created_datetime_utc: (data?.created_datetime_utc as string | null) ?? null,
    modified_datetime_utc: (data?.modified_datetime_utc as string | null) ?? null,
    email_address: (data?.email_address as string | null) ?? null,
  };
}

export async function createWhitelistedEmailAddressInlineAction(input: { emailAddress: string }) {
  await requireSuperadmin();

  const emailAddress = normalizeEmailAddress(input?.emailAddress);
  const validationError = validateEmailAddress(emailAddress);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("whitelist_email_addresses")
    .insert({ email_address: emailAddress })
    .select("id, created_datetime_utc, modified_datetime_utc, email_address")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to create email address: ${result.error.message}` };
  }

  revalidatePath("/admin/whitelisted-email-addresses");
  return { ok: true as const, row: toRow(result.data) };
}

export async function updateWhitelistedEmailAddressInlineAction(input: { id: string; emailAddress: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  const emailAddress = normalizeEmailAddress(input?.emailAddress);

  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const validationError = validateEmailAddress(emailAddress);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("whitelist_email_addresses")
    .update({ email_address: emailAddress })
    .eq("id", id)
    .select("id, created_datetime_utc, modified_datetime_utc, email_address")
    .single()) as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (result.error) {
    return { ok: false as const, error: `Failed to update email address: ${result.error.message}` };
  }

  revalidatePath("/admin/whitelisted-email-addresses");
  return { ok: true as const, row: toRow(result.data) };
}

export async function deleteWhitelistedEmailAddressInlineAction(input: { id: string }) {
  await requireSuperadmin();

  const id = cleanId(input?.id);
  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("whitelist_email_addresses").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: `Failed to delete email address: ${error.message}` };
  }

  revalidatePath("/admin/whitelisted-email-addresses");
  return { ok: true as const };
}
