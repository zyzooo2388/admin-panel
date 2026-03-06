"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";

import ImagePreview from "./ImagePreview";
import { createImageInlineAction, deleteImageAction, updateImageAction } from "./actions";

type ImageRecord = Record<string, unknown>;

type ImagesPageClientProps = {
  initialImages: ImageRecord[];
  urlColumn: string | null;
  createdColumn: string | null;
  initialError: string | null;
  initialSuccess: string | null;
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
}: ImagesPageClientProps) {
  const [images, setImages] = useState<ImageRecord[]>(() => sortImagesNewestFirst(initialImages, createdColumn));
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess);
  const [isCreating, startCreateTransition] = useTransition();
  const createFormRef = useRef<HTMLFormElement>(null);

  const showCreated = Boolean(createdColumn);
  const colSpan = 4 + (showCreated ? 1 : 0);

  const renderedRows = useMemo(() => sortImagesNewestFirst(images, createdColumn), [images, createdColumn]);

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

      setImages((previous) => {
        if (createdColumn) {
          return sortImagesNewestFirst([...previous, result.image], createdColumn);
        }

        return [result.image, ...previous];
      });

      createFormRef.current?.reset();
      setErrorMessage(null);
      setSuccessMessage("Image created.");
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Images</h1>
      <p className="mt-1 text-sm text-zinc-600">Create, edit, and delete image records.</p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">Create image</h2>
        <form ref={createFormRef} onSubmit={onCreateSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="md:col-span-3 inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!urlColumn || isCreating}
          >
            {isCreating ? "Creating..." : "Create image"}
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">URL</th>
              {showCreated ? <th className="px-4 py-3">Created</th> : null}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderedRows.length > 0 ? (
              renderedRows.map((image) => {
                const id = String(image.id ?? "");
                const imageUrl = String(image[urlColumn as string] ?? "");
                const createdValue = showCreated ? image[createdColumn as string] : null;

                return (
                  <tr key={id} className="border-t border-zinc-100 align-top text-zinc-700">
                    <td className="px-4 py-3">
                      <ImagePreview src={imageUrl} alt={`Image ${id || "preview"}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{id || "-"}</td>
                    <td className="px-4 py-3">
                      {imageUrl ? (
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-[24rem] truncate text-blue-600 hover:underline"
                          title={imageUrl}
                        >
                          {imageUrl}
                        </a>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    {showCreated ? (
                      <td className="px-4 py-3">{createdValue ? new Date(String(createdValue)).toLocaleString() : "-"}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      <form action={updateImageAction} className="mb-2 space-y-2">
                        <input type="hidden" name="id" value={id} />
                        <input type="hidden" name="url_column" value={urlColumn ?? ""} />
                        <input
                          name="url"
                          type="url"
                          defaultValue={imageUrl}
                          required
                          className="w-64 rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                          disabled={!urlColumn}
                        >
                          Save
                        </button>
                      </form>

                      <form action={deleteImageAction}>
                        <input type="hidden" name="id" value={id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
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
                <td className="px-4 py-4 text-zinc-500" colSpan={colSpan}>
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
