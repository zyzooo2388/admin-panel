/**
 * Supabase Storage bucket configuration for images.
 *
 * Local development: set in `.env.local`.
 * Vercel preview/production: set in Project Settings -> Environment Variables.
 * After changing Vercel environment variables, redeploy to apply them.
 */
export function getImageBucket() {
  const candidates = [process.env.SUPABASE_IMAGE_BUCKET, process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET];

  for (const candidate of candidates) {
    const bucket = candidate?.trim();
    if (bucket) {
      return bucket;
    }
  }

  return null;
}

export function getImageBucketValidationError(bucketName: string | null) {
  if (!bucketName) {
    return "Image upload bucket is not configured. Set SUPABASE_IMAGE_BUCKET or NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET.";
  }

  // Supabase expects only a bucket name (for example: "images"), not a full URL/path.
  if (bucketName.includes("://") || bucketName.includes("/")) {
    return `Invalid image upload bucket "${bucketName}". Use a bucket name like "images", not a URL.`;
  }

  return null;
}
