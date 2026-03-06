import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { IMAGE_URL_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import ImagesPageClient from "./ImagesPageClient";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

const IMAGE_CREATED_TIMESTAMP_COLUMNS = ["created_at", "createdAt", "inserted_at"] as const;

export default async function ImagesPage({ searchParams }: Props) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const urlColumn = await pickFirstWorkingColumn(supabase, "images", IMAGE_URL_FALLBACK_COLUMNS);
  const createdColumn = await pickFirstWorkingColumn(supabase, "images", IMAGE_CREATED_TIMESTAMP_COLUMNS);

  let images: Record<string, unknown>[] | null = null;
  let errorMessage: string | null = null;

  if (!urlColumn) {
    errorMessage = `Failed to load images: none of these URL columns exist: ${IMAGE_URL_FALLBACK_COLUMNS.join(", ")}`;
  } else {
    const selectColumns = ["id", urlColumn];
    if (createdColumn) {
      selectColumns.push(createdColumn);
    }

    let query = supabase.from("images").select(selectColumns.join(", "));
    if (createdColumn) {
      query = query.order(createdColumn, { ascending: false });
    }

    const { data, error } = await query.limit(200);
    images = data as Record<string, unknown>[] | null;
    errorMessage = error ? `Failed to load images: ${error.message}` : null;
  }

  return (
    <ImagesPageClient
      initialImages={images ?? []}
      urlColumn={urlColumn}
      createdColumn={createdColumn}
      initialError={errorMessage ?? params.error ?? null}
      initialSuccess={params.success ?? null}
    />
  );
}
