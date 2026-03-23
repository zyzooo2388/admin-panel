"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { IMAGE_URL_FALLBACK_COLUMNS } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const IMAGE_CREATED_TIMESTAMP_COLUMNS = ["created_at", "createdAt", "inserted_at"] as const;
const DEFAULT_IMAGE_UPLOAD_DIR = "admin-uploads";

function getImageBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? process.env.SUPABASE_IMAGE_BUCKET ?? null;
}

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

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "upload.bin";
}

export async function createImageAction(formData: FormData) {
  const auth = await requireSuperadmin();

  const url = cleanOptionalString(formData.get("url"));
  const urlColumn = cleanUrlColumn(formData.get("url_column"));

  if (!url) {
    redirect(toImagesPath("error", "Image URL is required."));
  }
  if (!urlColumn) {
    redirect(toImagesPath("error", "No valid image URL column was found."));
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, string> = {
    [urlColumn]: url,
    created_by_user_id: auth.user.id,
    modified_by_user_id: auth.user.id,
  };

  const result = await supabase.from("images").insert(payload);

  if (result.error) {
    redirect(toImagesPath("error", `Failed to create image: ${result.error.message}`));
  }

  revalidatePath("/admin/images");
  redirect(toImagesPath("success", "Image created."));
}

export async function createImageInlineAction(input: { url: string; urlColumn: string; createdColumn: string | null }) {
  const auth = await requireSuperadmin();

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
  const payload: Record<string, string> = {
    [urlColumn]: url,
    created_by_user_id: auth.user.id,
    modified_by_user_id: auth.user.id,
  };
  const selectColumns = createdColumn ? ["id", urlColumn, createdColumn] : ["id", urlColumn];
  const result = (await supabase.from("images").insert(payload).select(selectColumns.join(", ")).single()) as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (result.error) {
    return { ok: false as const, error: `Failed to create image: ${result.error.message}` };
  }

  revalidatePath("/admin/images");
  const imageRecord = result.data && typeof result.data === "object" ? result.data : {};
  return { ok: true as const, image: imageRecord };
}

export async function createImageUploadInlineAction(input: {
  file: File;
  urlColumn: string;
  createdColumn: string | null;
}) {
  const auth = await requireSuperadmin();

  const file = input?.file;
  const urlColumn = cleanUrlColumn(input?.urlColumn ?? null);
  const createdColumn = cleanCreatedColumn(input?.createdColumn);
  const bucketName = getImageBucketName();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "A file is required." };
  }
  if (!urlColumn) {
    return { ok: false as const, error: "No valid image URL column was found." };
  }
  if (!bucketName) {
    return {
      ok: false as const,
      error: "Image upload bucket is not configured. Set NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET or SUPABASE_IMAGE_BUCKET.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const safeName = sanitizeFileName(file.name);
  const path = `${DEFAULT_IMAGE_UPLOAD_DIR}/${Date.now()}-${safeName}`;
  const uploadResult = await supabase.storage.from(bucketName).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadResult.error) {
    return { ok: false as const, error: `Failed to upload image: ${uploadResult.error.message}` };
  }

  const publicUrlResult = supabase.storage.from(bucketName).getPublicUrl(path);
  const publicUrl = publicUrlResult.data.publicUrl;

  if (!publicUrl) {
    return { ok: false as const, error: "Failed to build uploaded image URL." };
  }

  const payload: Record<string, string> = {
    [urlColumn]: publicUrl,
    created_by_user_id: auth.user.id,
    modified_by_user_id: auth.user.id,
  };
  const selectColumns = createdColumn ? ["id", urlColumn, createdColumn] : ["id", urlColumn];
  const insertResult = (await supabase.from("images").insert(payload).select(selectColumns.join(", ")).single()) as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (insertResult.error) {
    return { ok: false as const, error: `Upload succeeded but DB insert failed: ${insertResult.error.message}` };
  }

  revalidatePath("/admin/images");
  return { ok: true as const, image: insertResult.data ?? {} };
}

export async function updateImageAction(formData: FormData) {
  const auth = await requireSuperadmin();

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
  const payload: Record<string, string> = {
    [urlColumn]: url,
    modified_by_user_id: auth.user.id,
  };

  const result = await supabase.from("images").update(payload).eq("id", id);

  if (result.error) {
    redirect(toImagesPath("error", `Failed to update image: ${result.error.message}`));
  }

  revalidatePath("/admin/images");
  redirect(toImagesPath("success", "Image updated."));
}

export async function updateImageInlineAction(input: {
  id: string;
  url: string;
  urlColumn: string;
  createdColumn: string | null;
}) {
  const auth = await requireSuperadmin();

  const id = typeof input?.id === "string" ? input.id.trim() : "";
  const url = typeof input?.url === "string" ? input.url.trim() : "";
  const urlColumn = cleanUrlColumn(input?.urlColumn ?? null);
  const createdColumn = cleanCreatedColumn(input?.createdColumn);

  if (!id || !url) {
    return { ok: false as const, error: "Image ID and URL are required." };
  }
  if (!urlColumn) {
    return { ok: false as const, error: "No valid image URL column was found." };
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, string> = {
    [urlColumn]: url,
    modified_by_user_id: auth.user.id,
  };
  const selectColumns = createdColumn ? ["id", urlColumn, createdColumn] : ["id", urlColumn];
  const result = (await supabase
    .from("images")
    .update(payload)
    .eq("id", id)
    .select(selectColumns.join(", "))
    .single()) as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (result.error) {
    return { ok: false as const, error: `Failed to update image: ${result.error.message}` };
  }

  revalidatePath("/admin/images");
  return { ok: true as const, image: result.data ?? {} };
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
