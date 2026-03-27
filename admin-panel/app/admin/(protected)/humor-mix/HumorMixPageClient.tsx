"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type HumorMixRow = {
  id: number;
  created_datetime_utc: string | null;
  humor_flavor_id: number;
  caption_count: number;
};

export type HumorFlavorOption = {
  id: number;
  slug: string | null;
  description: string | null;
};

type RowFormState = {
  humor_flavor_id: string;
  caption_count: string;
};

type RowErrorState = {
  humor_flavor_id?: string;
  caption_count?: string;
  general?: string;
};

type Props = {
  title: string;
  description: string;
  rows: HumorMixRow[];
  humorFlavors: HumorFlavorOption[];
  humorFlavorsError: string | null;
  errorMessage: string | null;
  successMessage: string | null;
  emptyStateMessage?: string;
};

const NULL_LIKE_VALUES = new Set(["null", "undefined", "nan"]);

function formatUtc(value: string | null) {
  return formatUtcDate(value, { emptyFallback: "Unknown", invalidFallback: "Unknown" });
}

function toFormState(row: HumorMixRow): RowFormState {
  return {
    humor_flavor_id: String(row.humor_flavor_id),
    caption_count: String(row.caption_count),
  };
}

function sanitizeReturnedRow(row: unknown): HumorMixRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const id = Number(candidate.id);
  const humorFlavorId = Number(candidate.humor_flavor_id);
  const captionCount = Number(candidate.caption_count);

  if (!Number.isFinite(id) || !Number.isFinite(humorFlavorId) || !Number.isFinite(captionCount)) {
    return null;
  }

  return {
    id,
    created_datetime_utc: typeof candidate.created_datetime_utc === "string" ? candidate.created_datetime_utc : null,
    humor_flavor_id: humorFlavorId,
    caption_count: captionCount,
  };
}

function parseStrictInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (NULL_LIKE_VALUES.has(trimmed.toLowerCase())) {
    return null;
  }

  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export default function HumorMixPageClient({
  title,
  description,
  rows,
  humorFlavors,
  humorFlavorsError,
  errorMessage,
  successMessage,
  emptyStateMessage,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const actorProfileIdRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [tableRows, setTableRows] = useState<HumorMixRow[]>(rows);
  const [formsById, setFormsById] = useState<Record<number, RowFormState>>(
    () => Object.fromEntries(rows.map((row) => [row.id, toFormState(row)])),
  );
  const [errorsById, setErrorsById] = useState<Record<number, RowErrorState>>({});
  const [savingById, setSavingById] = useState<Record<number, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(errorMessage);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(successMessage);
  const validFlavorIds = useMemo(() => new Set(humorFlavors.map((flavor) => flavor.id)), [humorFlavors]);

  useEffect(() => {
    if (humorFlavorsError) {
      console.error("Failed to load humor flavor options for Humor Mix:", humorFlavorsError);
    }
  }, [humorFlavorsError]);

  function buildFriendlySaveError(message?: string | null) {
    const normalized = (message ?? "").toLowerCase();
    if (
      normalized.includes("humor_flavor_mix_humor_flavor_id_fkey") ||
      (normalized.includes("foreign key") && normalized.includes("humor_flavor_id"))
    ) {
      return "Save failed because the Humor Flavor ID is not linked to an existing humor flavor.";
    }

    return message?.trim() || "Save failed due to an unexpected error.";
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tableRows;
    }

    return tableRows.filter((row) => {
      const form = formsById[row.id] ?? toFormState(row);
      return [
        String(row.id),
        row.created_datetime_utc ?? "",
        form.humor_flavor_id,
        form.caption_count,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [formsById, search, tableRows]);

  const resolvedEmptyStateMessage = emptyStateMessage ?? "No rows found.";
  const flavorOptionsAvailable = humorFlavors.length > 0;

  function getHumorFlavorOptionLabel(flavor: HumorFlavorOption) {
    if (flavor.slug) {
      return `${flavor.id} - ${flavor.slug}`;
    }

    if (flavor.description) {
      return `${flavor.id} - ${flavor.description}`;
    }

    return String(flavor.id);
  }

  async function getActorProfileId() {
    if (actorProfileIdRef.current) {
      return actorProfileIdRef.current;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) {
      return null;
    }

    actorProfileIdRef.current = user.id;
    return user.id;
  }

  function setFormValue(rowId: number, field: keyof RowFormState, value: string) {
    setFormsById((current) => ({
      ...current,
      [rowId]: {
        ...(current[rowId] ?? {
          humor_flavor_id: "",
          caption_count: "",
        }),
        [field]: value,
      },
    }));
    setErrorsById((current) => {
      const rowErrors = current[rowId];
      if (!rowErrors) {
        return current;
      }

      return {
        ...current,
        [rowId]: {
          ...rowErrors,
          [field]: undefined,
          general: undefined,
        },
      };
    });
  }

  async function handleSave(rowId: number) {
    if (savingById[rowId]) {
      return;
    }

    const currentForm = formsById[rowId];
    const humorFlavorRaw = (currentForm?.humor_flavor_id ?? "").trim();
    const captionCountRaw = (currentForm?.caption_count ?? "").trim();

    const parsedHumorFlavorId = parseStrictInteger(humorFlavorRaw);
    const parsedCaptionCount = parseStrictInteger(captionCountRaw);
    const nextErrors: RowErrorState = {};

    if (parsedHumorFlavorId === null) {
      nextErrors.humor_flavor_id = "Please select a Humor Flavor ID.";
    } else if (!validFlavorIds.has(parsedHumorFlavorId)) {
      nextErrors.humor_flavor_id = "Please select a valid Humor Flavor ID from the list.";
    }

    if (parsedCaptionCount === null) {
      nextErrors.caption_count = "Caption Count must be a valid number.";
    }

    if (nextErrors.humor_flavor_id || nextErrors.caption_count) {
      setErrorsById((current) => ({ ...current, [rowId]: nextErrors }));
      setGlobalError("Please fix validation errors before saving.");
      setGlobalSuccess(null);
      return;
    }

    setSavingById((current) => ({ ...current, [rowId]: true }));
    setErrorsById((current) => ({ ...current, [rowId]: {} }));
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const actorProfileId = await getActorProfileId();
      if (!actorProfileId) {
        setErrorsById((current) => ({
          ...current,
          [rowId]: { ...(current[rowId] ?? {}), general: "Save failed: unable to resolve current user." },
        }));
        setGlobalError("Failed to update Humor Mix: unable to resolve current user.");
        return;
      }

      const { data, error } = await supabase
        .from("humor_flavor_mix")
        .update({
          humor_flavor_id: parsedHumorFlavorId,
          caption_count: parsedCaptionCount,
          modified_by_user_id: actorProfileId,
        })
        .eq("id", rowId)
        .select()
        .single();

      if (error) {
        const friendlyMessage = buildFriendlySaveError(error.message);
        setErrorsById((current) => ({
          ...current,
          [rowId]: { ...(current[rowId] ?? {}), general: friendlyMessage },
        }));
        setGlobalError(friendlyMessage);
        return;
      }

      const updatedRow = sanitizeReturnedRow(data);
      if (!updatedRow) {
        setErrorsById((current) => ({
          ...current,
          [rowId]: { ...(current[rowId] ?? {}), general: "Save failed: invalid response from server." },
        }));
        setGlobalError("Failed to update Humor Mix: invalid response from server.");
        return;
      }

      setTableRows((current) => current.map((row) => (row.id === updatedRow.id ? updatedRow : row)));
      setFormsById((current) => ({ ...current, [updatedRow.id]: toFormState(updatedRow) }));
      setErrorsById((current) => ({ ...current, [updatedRow.id]: {} }));
      setGlobalSuccess("Humor Mix record updated.");
    } catch (error) {
      const message = buildFriendlySaveError(error instanceof Error ? error.message : "Unknown error");
      setErrorsById((current) => ({
        ...current,
        [rowId]: { ...(current[rowId] ?? {}), general: message },
      }));
      setGlobalError(message);
    } finally {
      setSavingById((current) => ({ ...current, [rowId]: false }));
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-description">{description}</p>

      {globalError ? <p className="admin-alert-danger mt-4">{globalError}</p> : null}
      {globalSuccess ? <p className="admin-alert-success mt-4">{globalSuccess}</p> : null}

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full sm:max-w-md text-xs text-slate-500">
          <span className="mb-1.5 block font-medium">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, created date, or field values..."
            className="admin-input"
          />
        </label>
        <p className="admin-summary-pill">
          Showing{" "}
          {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
        </p>
      </section>

      <section className="admin-table-wrap mt-5">
        {filteredRows.length > 0 ? (
          <table className="admin-table min-w-full">
            <colgroup>
              <col className="w-28" />
              <col className="w-60" />
              <col className="w-[28rem]" />
              <col className="w-40" />
              <col className="w-36" />
            </colgroup>
            <thead className="text-left">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5">Humor Flavor ID</th>
                <th className="px-5 py-3.5">Caption Count</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const form = formsById[row.id] ?? toFormState(row);
                const rowErrors = errorsById[row.id] ?? {};
                const isSaving = savingById[row.id] ?? false;
                const hasRowError = Boolean(rowErrors.general || rowErrors.humor_flavor_id || rowErrors.caption_count);

                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.id}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-700">{formatUtc(row.created_datetime_utc)}</td>
                      <td className="px-5 py-3.5 min-w-[220px]">
                        <div className="relative w-full min-w-[260px]">
                          <select
                            value={form.humor_flavor_id}
                            onChange={(event) => setFormValue(row.id, "humor_flavor_id", event.target.value)}
                            className="admin-input h-9 w-full min-w-0 appearance-none overflow-hidden text-ellipsis whitespace-nowrap pl-4 pr-12"
                            aria-label={`Humor flavor for record ${row.id}`}
                          >
                            <option value="">
                              {humorFlavorsError
                                ? "Failed to load humor flavors"
                                : flavorOptionsAvailable
                                  ? "Select humor flavor"
                                  : "No humor flavors available"}
                            </option>
                            {!validFlavorIds.has(Number(form.humor_flavor_id)) && form.humor_flavor_id.trim() ? (
                              <option value={form.humor_flavor_id}>{form.humor_flavor_id} - missing flavor</option>
                            ) : null}
                            {humorFlavors.map((flavor) => (
                              <option key={flavor.id} value={String(flavor.id)}>
                                {getHumorFlavorOptionLabel(flavor)}
                              </option>
                            ))}
                          </select>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500"
                          >
                            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                              <path
                                d="M5 7.5L10 12.5L15 7.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          step={1}
                          value={form.caption_count}
                          onChange={(event) => setFormValue(row.id, "caption_count", event.target.value)}
                          className="admin-input h-9 min-w-24"
                          aria-label={`Caption count for record ${row.id}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => void handleSave(row.id)}
                          disabled={isSaving}
                          className="admin-button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                    {hasRowError ? (
                      <tr className="bg-red-50/30">
                        <td className="px-4 pb-3 pt-2" colSpan={5}>
                          <div className="space-y-1">
                            {rowErrors.humor_flavor_id ? <p className="admin-alert-danger text-xs">Humor Flavor ID: {rowErrors.humor_flavor_id}</p> : null}
                            {rowErrors.caption_count ? <p className="admin-alert-danger text-xs">Caption Count: {rowErrors.caption_count}</p> : null}
                            {rowErrors.general ? <p className="admin-alert-danger text-xs">{rowErrors.general}</p> : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">{resolvedEmptyStateMessage}</p>
        )}
      </section>
    </div>
  );
}
