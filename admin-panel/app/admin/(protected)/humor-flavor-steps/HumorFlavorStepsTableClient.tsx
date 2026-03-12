"use client";

import { Fragment, useMemo, useState } from "react";

export type HumorFlavorStepRow = {
  id: number | string | null;
  created_datetime_utc: string | null;
  humor_flavor_id: number | string | null;
  llm_temperature: number | null;
  order_by: number | null;
  llm_input_type_id: number | string | null;
  llm_output_type_id: number | string | null;
  llm_model_id: number | string | null;
  humor_flavor_step_type_id: number | string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
};

export type LookupMaps = {
  flavorLabels: Record<string, string>;
  modelLabels: Record<string, string>;
  inputTypeLabels: Record<string, string>;
  outputTypeLabels: Record<string, string>;
  stepTypeLabels: Record<string, string>;
};

type Props = {
  rows: HumorFlavorStepRow[];
  lookups: LookupMaps;
  errorMessage: string | null;
};

const UTC_DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const PROMPT_PREVIEW_LIMIT = 170;
const DESCRIPTION_PREVIEW_LIMIT = 70;

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function clipText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3)}...`;
}

function toIdKey(value: number | string | null) {
  return value === null ? null : String(value);
}

function toFallback(prefix: string, value: number | string | null) {
  if (value === null) {
    return "-";
  }
  return `${prefix} #${value}`;
}

function resolveLabel(map: Record<string, string>, fallbackPrefix: string, value: number | string | null) {
  const key = toIdKey(value);
  if (key && map[key]) {
    return map[key];
  }
  return toFallback(fallbackPrefix, value);
}

function formatUtc(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
}

function temperatureLabel(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Default";
  }
  return String(value);
}

function promptPreview(row: HumorFlavorStepRow) {
  const parts: string[] = [];
  const systemPrompt = normalizeText(row.llm_system_prompt);
  const userPrompt = normalizeText(row.llm_user_prompt);

  if (systemPrompt) {
    parts.push(`System: ${systemPrompt}`);
  }
  if (userPrompt) {
    parts.push(`User: ${userPrompt}`);
  }

  if (parts.length === 0) {
    return "-";
  }

  return clipText(parts.join(" | "), PROMPT_PREVIEW_LIMIT);
}

function toSearchBlob(row: HumorFlavorStepRow, lookups: LookupMaps) {
  const values = [
    row.id,
    row.humor_flavor_id,
    row.llm_model_id,
    row.description,
    row.llm_system_prompt,
    row.llm_user_prompt,
    resolveLabel(lookups.flavorLabels, "Flavor", row.humor_flavor_id),
    resolveLabel(lookups.modelLabels, "Model", row.llm_model_id),
    resolveLabel(lookups.stepTypeLabels, "Type", row.humor_flavor_step_type_id),
  ];

  return values.map((value) => normalizeText(value).toLowerCase()).join(" ");
}

function toOrderValue(row: HumorFlavorStepRow) {
  if (typeof row.order_by === "number" && Number.isFinite(row.order_by)) {
    return row.order_by;
  }
  return Number.POSITIVE_INFINITY;
}

function toIdSortValue(id: number | string | null) {
  if (typeof id === "number") {
    return id;
  }
  if (typeof id === "string") {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

export default function HumorFlavorStepsTableClient({ rows, lookups, errorMessage }: Props) {
  const [query, setQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const flavorA = resolveLabel(lookups.flavorLabels, "Flavor", a.humor_flavor_id).toLowerCase();
      const flavorB = resolveLabel(lookups.flavorLabels, "Flavor", b.humor_flavor_id).toLowerCase();
      const flavorComparison = flavorA.localeCompare(flavorB);
      if (flavorComparison !== 0) {
        return flavorComparison;
      }

      const orderComparison = toOrderValue(a) - toOrderValue(b);
      if (orderComparison !== 0) {
        return orderComparison;
      }

      return toIdSortValue(a.id) - toIdSortValue(b.id);
    });
  }, [rows, lookups]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return sortedRows;
    }

    return sortedRows.filter((row) => toSearchBlob(row, lookups).includes(search));
  }, [query, sortedRows, lookups]);

  const summary =
    query.trim().length > 0
      ? `Showing ${filteredRows.length} of ${sortedRows.length} humor flavor steps`
      : `Showing ${sortedRows.length} humor flavor steps`;

  function rowKey(row: HumorFlavorStepRow, index: number) {
    if (row.id !== null) {
      return String(row.id);
    }
    return `row-${index}`;
  }

  function toggleExpanded(key: string) {
    setExpandedRows((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Humor Flavor Steps</h1>
      <p className="mt-1 text-sm text-zinc-600">Read-only workflow view of `public.humor_flavor_steps`.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700">{summary}</p>
        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID, flavor, description, prompts, model, or foreign keys..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-48" />
            <col className="w-24" />
            <col className="w-44" />
            <col className="w-44" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-[34%]" />
            <col className="w-52" />
            <col className="w-24" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Flavor</th>
              <th className="px-4 py-3">Step Order</th>
              <th className="px-4 py-3">Step Type</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Temperature</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Prompt Preview</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-sm text-red-600" colSpan={10}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const key = rowKey(row, index);
                const flavorLabel = resolveLabel(lookups.flavorLabels, "Flavor", row.humor_flavor_id);
                const stepTypeLabel = resolveLabel(lookups.stepTypeLabels, "Type", row.humor_flavor_step_type_id);
                const modelLabel = resolveLabel(lookups.modelLabels, "Model", row.llm_model_id);
                const inputLabel = resolveLabel(lookups.inputTypeLabels, "Input Type", row.llm_input_type_id);
                const outputLabel = resolveLabel(lookups.outputTypeLabels, "Output Type", row.llm_output_type_id);
                const description = normalizeText(row.description);
                const isExpanded = Boolean(expandedRows[key]);

                return (
                  <Fragment key={key}>
                    <tr className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/90">
                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-900">{flavorLabel}</div>
                        <div className="mt-1 font-mono text-[11px] text-zinc-400">Flavor ID: {row.humor_flavor_id ?? "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex min-w-8 justify-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700">
                          {row.order_by ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
                          {stepTypeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">
                          {modelLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            row.llm_temperature === null
                              ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {temperatureLabel(row.llm_temperature)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {description ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {clipText(description, DESCRIPTION_PREVIEW_LIMIT)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">No description</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-zinc-700">{promptPreview(row)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600">
                            {inputLabel}
                          </span>
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600">
                            {outputLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-500">{formatUtc(row.created_datetime_utc)}</td>
                      <td className="px-4 py-4 font-mono text-xs text-zinc-400">{row.id ?? "-"}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(key)}
                          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/70">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">System Prompt</p>
                              <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-800 whitespace-pre-wrap break-words">
                                {row.llm_system_prompt?.trim() || "-"}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">User Prompt</p>
                              <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-800 whitespace-pre-wrap break-words">
                                {row.llm_user_prompt?.trim() || "-"}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600">
                              Input Type ID: {row.llm_input_type_id ?? "-"}
                            </span>
                            <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600">
                              Output Type ID: {row.llm_output_type_id ?? "-"}
                            </span>
                            <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600">
                              Model ID: {row.llm_model_id ?? "-"}
                            </span>
                            <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600">
                              Step Type ID: {row.humor_flavor_step_type_id ?? "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={10}>
                  No humor flavor steps found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
