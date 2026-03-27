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

type SupabaseError = {
  code?: string;
  message: string;
} | null;

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

async function emailExists(params: { emailAddress: string; excludeId?: string }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("whitelist_email_addresses").select("id").eq("email_address", params.emailAddress).limit(1);

  if (params.excludeId) {
    query = query.neq("id", params.excludeId);
  }

  const result = (await query) as { data: Array<{ id: string | number }> | null; error: SupabaseError };
  return {
    exists: Boolean(result.data && result.data.length > 0),
    error: result.error,
  };
}

function isDuplicateError(error: SupabaseError) {
  if (!error) {
    return false;
  }

  return error.code === "23505" || error.message.toLowerCase().includes("duplicate key value");
}

export async function createWhitelistedEmailAddressInlineAction(input: { emailAddress: string }) {
  const auth = await requireSuperadmin();

  const emailAddress = normalizeEmailAddress(input?.emailAddress);
  const validationError = validateEmailAddress(emailAddress);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const duplicateCheck = await emailExists({ emailAddress });
  if (duplicateCheck.error) {
    return { ok: false as const, error: "Failed to create email address. Please try again." };
  }
  if (duplicateCheck.exists) {
    return { ok: false as const, error: "This email is already in the whitelist." };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("whitelist_email_addresses")
    .insert({
      email_address: emailAddress,
      created_by_user_id: auth.user.id,
      modified_by_user_id: auth.user.id,
    })
    .select("id, created_datetime_utc, modified_datetime_utc, email_address")
    .single()) as { data: Record<string, unknown> | null; error: SupabaseError };

  if (result.error) {
    if (isDuplicateError(result.error)) {
      return { ok: false as const, error: "This email is already in the whitelist." };
    }

    return { ok: false as const, error: "Failed to create email address. Please try again." };
  }

  revalidatePath("/admin/whitelisted-email-addresses");
  return { ok: true as const, row: toRow(result.data) };
}

export async function updateWhitelistedEmailAddressInlineAction(input: { id: string; emailAddress: string }) {
  const auth = await requireSuperadmin();

  const id = cleanId(input?.id);
  const emailAddress = normalizeEmailAddress(input?.emailAddress);

  if (!id) {
    return { ok: false as const, error: "Row ID is required." };
  }

  const validationError = validateEmailAddress(emailAddress);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  const duplicateCheck = await emailExists({ emailAddress, excludeId: id });
  if (duplicateCheck.error) {
    return { ok: false as const, error: "Failed to update email address. Please try again." };
  }
  if (duplicateCheck.exists) {
    return { ok: false as const, error: "That email is already used by another whitelist entry." };
  }

  const supabase = await createSupabaseServerClient();
  const result = (await supabase
    .from("whitelist_email_addresses")
    .update({
      email_address: emailAddress,
      modified_by_user_id: auth.user.id,
    })
    .eq("id", id)
    .select("id, created_datetime_utc, modified_datetime_utc, email_address")
    .single()) as { data: Record<string, unknown> | null; error: SupabaseError };

  if (result.error) {
    if (isDuplicateError(result.error)) {
      return { ok: false as const, error: "That email is already used by another whitelist entry." };
    }

    return { ok: false as const, error: "Failed to update email address. Please try again." };
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
