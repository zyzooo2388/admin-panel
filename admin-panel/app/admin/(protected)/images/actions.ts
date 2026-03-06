"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { IMAGE_URL_FALLBACK_COLUMNS } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const IMAGE_CREATED_TIMESTAMP_COLUMNS = ["created_at", "createdAt", "inserted_at"] as const;

function cleanOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toImagesPath(status: "error" | "success", message: string) {
  const params = new URLSearchParams({ [status]: message });
  return `/admin/images?${params.toString()}`;
}

function cleanUrlColumn(value: FormDataEntryValue | null) {
  const column = cleanOptionalString(value);
  if (!column) {
    return null;
  }

  return IMAGE_URL_FALLBACK_COLUMNS.includes(column as (typeof IMAGE_URL_FALLBACK_COLUMNS)[number]) ? column : null;
}

function cleanCreatedColumn(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return IMAGE_CREATED_TIMESTAMP_COLUMNS.includes(value as (typeof IMAGE_CREATED_TIMESTAMP_COLUMNS)[number]) ? value : null;
}

export async function createImageAction(formData: FormData) {
  await requireSuperadmin();

  const url = cleanOptionalString(formData.get("url"));
  const urlColumn = cleanUrlColumn(formData.get("url_column"));

  if (!url) {
    redirect(toImagesPath("error", "Image URL is required."));
  }
  if (!urlColumn) {
    redirect(toImagesPath("error", "No valid image URL column was found."));
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, string> = { [urlColumn]: url };

  const result = await supabase.from("images").insert(payload);

  if (result.error) {
    redirect(toImagesPath("error", `Failed to create image: ${result.error.message}`));
  }

  revalidatePath("/admin/images");
  redirect(toImagesPath("success", "Image created."));
}

export async function createImageInlineAction(input: { url: string; urlColumn: string; createdColumn: string | null }) {
  await requireSuperadmin();

  const url = typeof input?.url === "string" ? input.url.trim() : "";
  const urlColumn = cleanUrlColumn(input?.urlColumn ?? null);
  const createdColumn = cleanCreatedColumn(input?.createdColumn);

  if (!url) {
    return { ok: false as const, error: "Image URL is required." };
  }
  if (!urlColumn) {
    return { ok: false as const, error: "No valid image URL column was found." };
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, string> = { [urlColumn]: url };
  const selectColumns = createdColumn ? ["id", urlColumn, createdColumn] : ["id", urlColumn];
  const result = await supabase.from("images").insert(payload).select(selectColumns.join(", ")).single();

  if (result.error) {
    return { ok: false as const, error: `Failed to create image: ${result.error.message}` };
  }

  revalidatePath("/admin/images");
  return { ok: true as const, image: (result.data ?? {}) as Record<string, unknown> };
}

export async function updateImageAction(formData: FormData) {
  await requireSuperadmin();

  const id = cleanOptionalString(formData.get("id"));
  const url = cleanOptionalString(formData.get("url"));
  const urlColumn = cleanUrlColumn(formData.get("url_column"));

  if (!id || !url) {
    redirect(toImagesPath("error", "Image ID and URL are required."));
  }
  if (!urlColumn) {
    redirect(toImagesPath("error", "No valid image URL column was found."));
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, string> = { [urlColumn]: url };

  const result = await supabase.from("images").update(payload).eq("id", id);

  if (result.error) {
    redirect(toImagesPath("error", `Failed to update image: ${result.error.message}`));
  }

  revalidatePath("/admin/images");
  redirect(toImagesPath("success", "Image updated."));
}

export async function deleteImageAction(formData: FormData) {
  await requireSuperadmin();

  const id = cleanOptionalString(formData.get("id"));
  if (!id) {
    redirect(toImagesPath("error", "Image ID is required."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("images").delete().eq("id", id);

  if (error) {
    redirect(toImagesPath("error", `Failed to delete image: ${error.message}`));
  }

  revalidatePath("/admin/images");
  redirect(toImagesPath("success", "Image deleted."));
}
