import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { CREATED_TIMESTAMP_FALLBACK_COLUMNS, IMAGE_URL_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { getImageBucket, getImageBucketValidationError } from "@/lib/images/getImageBucket";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import ImagesPageClient from "./ImagesPageClient";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ImagesPage({ searchParams }: Props) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const imageBucket = getImageBucket();
  const imageBucketWarning = getImageBucketValidationError(imageBucket);

  const urlColumn = await pickFirstWorkingColumn(supabase, "images", IMAGE_URL_FALLBACK_COLUMNS);
  const createdColumn = await pickFirstWorkingColumn(supabase, "images", CREATED_TIMESTAMP_FALLBACK_COLUMNS);

  let images: Record<string, unknown>[] | null = null;
  let errorMessage: string | null = null;

  if (!urlColumn) {
    errorMessage = `Failed to load images: none of these URL columns exist: ${IMAGE_URL_FALLBACK_COLUMNS.join(", ")}`;
  } else {
    const selectColumns = ["id", urlColumn];
    if (createdColumn) {
      selectColumns.push(createdColumn);
    }

    // The list is always sourced from the database, so refresh/navigation must show persisted records.
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
      uploadBucketWarning={imageBucketWarning}
    />
  );
}
