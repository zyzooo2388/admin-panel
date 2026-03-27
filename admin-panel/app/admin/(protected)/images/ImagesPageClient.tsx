"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

import ImagePreview from "./ImagePreview";
import { createImageInlineAction, createImageUploadInlineAction, deleteImageAction, updateImageInlineAction } from "./actions";

type ImageRecord = Record<string, unknown>;

type ImagesPageClientProps = {
  initialImages: ImageRecord[];
  urlColumn: string | null;
  createdColumn: string | null;
  initialError: string | null;
  initialSuccess: string | null;
  uploadBucketWarning: string | null;
};

function createdValueToTimestamp(value: unknown): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(String(value)).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function sortImagesNewestFirst(images: ImageRecord[], createdColumn: string | null): ImageRecord[] {
  if (!createdColumn) {
    return images;
  }

  return [...images].sort((a, b) => {
    const aTimestamp = createdValueToTimestamp(a[createdColumn]);
    const bTimestamp = createdValueToTimestamp(b[createdColumn]);
    return bTimestamp - aTimestamp;
  });
}

export default function ImagesPageClient({
  initialImages,
  urlColumn,
  createdColumn,
  initialError,
  initialSuccess,
  uploadBucketWarning,
}: ImagesPageClientProps) {
  const router = useRouter();
  const [images, setImages] = useState<ImageRecord[]>(() => sortImagesNewestFirst(initialImages, createdColumn));
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess);
  const [isCreating, startCreateTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);

  const showCreated = Boolean(createdColumn);
  const colSpan = 4 + (showCreated ? 1 : 0);

  const renderedRows = useMemo(() => sortImagesNewestFirst(images, createdColumn), [images, createdColumn]);

  useEffect(() => {
    setImages(sortImagesNewestFirst(initialImages, createdColumn));
  }, [initialImages, createdColumn]);

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!urlColumn) {
      setErrorMessage("No valid image URL column was found.");
      setSuccessMessage(null);
      return;
    }
    const formData = new FormData(event.currentTarget);
    const urlValue = formData.get("url");
    const url = typeof urlValue === "string" ? urlValue.trim() : "";

    if (!url) {
      setErrorMessage("Image URL is required.");
      setSuccessMessage(null);
      return;
    }

    startCreateTransition(async () => {
      const result = await createImageInlineAction({ url, urlColumn, createdColumn });
      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      createFormRef.current?.reset();
      setErrorMessage(null);
      setSuccessMessage("Image created.");
      // Refresh from the server so the database stays the source of truth for the list.
      router.refresh();
    });
  };

  const onUploadSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!urlColumn) {
      setErrorMessage("No valid image URL column was found.");
      setSuccessMessage(null);
      return;
    }
    if (uploadBucketWarning) {
      setErrorMessage(uploadBucketWarning);
      setSuccessMessage(null);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;

    if (!file || file.size === 0) {
      setErrorMessage("Please choose an image file.");
      setSuccessMessage(null);
      return;
    }

    startUploadTransition(async () => {
      const result = await createImageUploadInlineAction({ file, urlColumn, createdColumn });
      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      uploadFormRef.current?.reset();
      setErrorMessage(null);
      setSuccessMessage("Image uploaded and created.");
      // Refresh from the server so uploads and URL creates both render persisted rows.
      router.refresh();
    });
  };

  const onUpdateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!urlColumn) {
      setErrorMessage("No valid image URL column was found.");
      setSuccessMessage(null);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const idValue = formData.get("id");
    const urlValue = formData.get("url");
    const id = typeof idValue === "string" ? idValue.trim() : "";
    const url = typeof urlValue === "string" ? urlValue.trim() : "";

    if (!id || !url) {
      setErrorMessage("Image ID and URL are required.");
      setSuccessMessage(null);
      return;
    }

    setSavingId(id);
    startSaveTransition(async () => {
      const result = await updateImageInlineAction({ id, url, urlColumn, createdColumn });

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        setSavingId(null);
        return;
      }

      setImages((previous) =>
        previous.map((image) => {
          const currentId = String(image.id ?? "");
          const updatedId = String(result.image.id ?? id);
          if (currentId !== updatedId) {
            return image;
          }

          return {
            ...image,
            ...result.image,
            [urlColumn]: String(result.image[urlColumn] ?? url),
          };
        }),
      );

      setErrorMessage(null);
      setSuccessMessage("Image updated.");
      setSavingId(null);
    });
  };

  return (
    <div>
      <h1 className="admin-page-title">Images</h1>
      <p className="admin-page-description">Create, edit, and delete image records.</p>

      {errorMessage ? <p className="admin-alert-danger mt-4">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert-success mt-4">{successMessage}</p> : null}

      <section className="admin-card mt-6 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Create image</h2>
        <form ref={createFormRef} onSubmit={onCreateSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="admin-input"
          />
          <button
            type="submit"
            className="admin-button-primary md:col-span-3 inline-flex w-fit px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!urlColumn || isCreating}
          >
            {isCreating ? "Creating..." : "Create image"}
          </button>
        </form>
      </section>

      <section className="admin-card mt-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Upload image file</h2>
        <p className="mt-1 text-xs text-slate-500">
          Requires a configured Supabase storage bucket via <code>NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET</code> or{" "}
          <code>SUPABASE_IMAGE_BUCKET</code>.
        </p>
        {uploadBucketWarning ? (
          <p className="admin-alert-danger mt-3 text-xs">{uploadBucketWarning}</p>
        ) : null}
        <form ref={uploadFormRef} onSubmit={onUploadSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            name="file"
            type="file"
            accept="image/*"
            required
            disabled={Boolean(uploadBucketWarning)}
            className="admin-input disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            className="admin-button-primary md:col-span-3 inline-flex w-fit px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!urlColumn || Boolean(uploadBucketWarning) || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload image"}
          </button>
        </form>
      </section>

      <section className="admin-table-wrap mt-6">
        <table className="admin-table min-w-full">
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">Preview</th>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">URL</th>
              {showCreated ? <th className="px-5 py-3.5">Created</th> : null}
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderedRows.length > 0 ? (
              renderedRows.map((image) => {
                const id = String(image.id ?? "");
                const imageUrl = String(image[urlColumn as string] ?? "");
                const createdValue = showCreated ? image[createdColumn as string] : null;

                return (
                  <tr key={id}>
                    <td className="px-5 py-3.5">
                      <ImagePreview key={`${id}:${imageUrl}`} src={imageUrl} alt={`Image ${id || "preview"}`} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">{id || "-"}</td>
                    <td className="px-5 py-3.5">
                      {imageUrl ? (
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-[24rem] truncate text-indigo-600 hover:underline"
                          title={imageUrl}
                        >
                          {imageUrl}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {showCreated ? (
                      <td className="px-5 py-3.5">{formatUtcDate(createdValue)}</td>
                    ) : null}
                    <td className="px-5 py-3.5">
                      <form onSubmit={onUpdateSubmit} className="mb-2 space-y-2">
                        <input type="hidden" name="id" value={id} />
                        <input type="hidden" name="url_column" value={urlColumn ?? ""} />
                        <input
                          name="url"
                          type="url"
                          defaultValue={imageUrl}
                          required
                          className="admin-input w-64 text-xs"
                        />
                        <button
                          type="submit"
                          className="admin-button-secondary px-3 py-1.5 text-xs"
                          disabled={!urlColumn || (isSaving && savingId === id)}
                        >
                          {isSaving && savingId === id ? "Saving..." : "Save"}
                        </button>
                      </form>

                      <form action={deleteImageAction}>
                        <input type="hidden" name="id" value={id} />
                        <button
                          type="submit"
                          className="admin-button-danger px-3 py-1.5 text-xs"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-4.5 text-slate-500" colSpan={colSpan}>
                  No images found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
