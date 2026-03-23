"use client";

import { Fragment, useMemo, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type HumorMixRow = {
  id: number;
  created_datetime_utc: string | null;
  humor_flavor_id: number;
  caption_count: number;
};

export type HumorFlavorOption = {
  id: number;
  name: string;
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
  errorMessage: string | null;
  successMessage: string | null;
  emptyStateMessage?: string;
};

const NULL_LIKE_VALUES = new Set(["null", "undefined", "nan"]);
const UTC_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatUtc(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${UTC_FORMATTER.format(parsed)} UTC`;
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
  const hasFlavorDropdown = humorFlavors.length > 0;

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

    if (parsedHumorFlavorId === null || (hasFlavorDropdown && !validFlavorIds.has(parsedHumorFlavorId))) {
      nextErrors.humor_flavor_id = "Humor Flavor ID must be a valid existing Humor Flavor";
    }

    if (parsedCaptionCount === null) {
      nextErrors.caption_count = "Caption Count must be a valid integer";
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
        setErrorsById((current) => ({
          ...current,
          [rowId]: { ...(current[rowId] ?? {}), general: `Save failed: ${error.message}` },
        }));
        setGlobalError(`Failed to update Humor Mix: ${error.message}`);
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
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorsById((current) => ({
        ...current,
        [rowId]: { ...(current[rowId] ?? {}), general: `Save failed: ${message}` },
      }));
      setGlobalError(`Failed to update Humor Mix: ${message}`);
    } finally {
      setSavingById((current) => ({ ...current, [rowId]: false }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>

      {globalError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{globalError}</p>
      ) : null}
      {globalSuccess ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{globalSuccess}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full sm:max-w-md text-xs text-zinc-600">
          <span className="mb-1.5 block font-medium">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, created date, or field values..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </label>
        <p className="text-sm text-zinc-500">
          Showing{" "}
          {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        {filteredRows.length > 0 ? (
          <table className="min-w-full text-sm">
            <colgroup>
              <col className="w-28" />
              <col className="w-60" />
              <col className="w-80" />
              <col className="w-40" />
              <col className="w-36" />
            </colgroup>
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Humor Flavor ID</th>
                <th className="px-4 py-3">Caption Count</th>
                <th className="px-4 py-3">Actions</th>
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
                    <tr className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/80">
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-600">{row.id}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-zinc-700">{formatUtc(row.created_datetime_utc)}</td>
                      <td className="px-4 py-3.5">
                        {hasFlavorDropdown ? (
                          <select
                            value={form.humor_flavor_id}
                            onChange={(event) => setFormValue(row.id, "humor_flavor_id", event.target.value)}
                            className="h-9 w-full min-w-64 rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 shadow-sm"
                            aria-label={`Humor flavor for record ${row.id}`}
                          >
                            <option value="">Select humor flavor</option>
                            {humorFlavors.map((flavor) => (
                              <option key={flavor.id} value={String(flavor.id)}>
                                {flavor.id} - {flavor.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={form.humor_flavor_id}
                            onChange={(event) => setFormValue(row.id, "humor_flavor_id", event.target.value)}
                            className="h-9 w-full min-w-56 rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 shadow-sm"
                            aria-label={`Humor flavor ID for record ${row.id}`}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          step={1}
                          value={form.caption_count}
                          onChange={(event) => setFormValue(row.id, "caption_count", event.target.value)}
                          className="h-9 w-full min-w-24 rounded-md border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 shadow-sm"
                          aria-label={`Caption count for record ${row.id}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => void handleSave(row.id)}
                          disabled={isSaving}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                    {hasRowError ? (
                      <tr className="border-t border-zinc-100 bg-red-50/40">
                        <td className="px-4 pb-3 pt-2 text-xs text-red-700" colSpan={5}>
                          <div className="space-y-1">
                            {rowErrors.humor_flavor_id ? <p>Humor Flavor ID: {rowErrors.humor_flavor_id}</p> : null}
                            {rowErrors.caption_count ? <p>Caption Count: {rowErrors.caption_count}</p> : null}
                            {rowErrors.general ? <p>{rowErrors.general}</p> : null}
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
          <p className="px-4 py-6 text-sm text-zinc-500">{resolvedEmptyStateMessage}</p>
        )}
      </section>
    </div>
  );
}
