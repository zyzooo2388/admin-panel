"use client";

import { Fragment, useMemo, useState } from "react";

type LlmResponseRow = {
  id: string | number | null;
  created_datetime_utc: string | null;
  llm_model_response: unknown;
  processing_time_seconds: number | string | null;
  llm_model_id: string | number | null;
};

type Props = {
  rows: LlmResponseRow[];
  errorMessage: string | null;
};

const PREVIEW_LENGTH = 150;

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

function toSafeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toPreview(value: unknown) {
  const normalized = toSafeText(value).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "-";
  }

  if (normalized.length <= PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, PREVIEW_LENGTH)}...`;
}

function formatUtcDatetime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
}

function parseSeconds(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatSeconds(value: number | string | null) {
  const seconds = parseSeconds(value);
  return seconds === null ? "-" : seconds.toFixed(3);
}

function timingToneClass(value: number | string | null) {
  const seconds = parseSeconds(value);
  if (seconds === null) {
    return "border-zinc-200 bg-zinc-100 text-zinc-600";
  }

  if (seconds < 1) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (seconds < 3) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default function LlmResponsesTableClient({ rows, errorMessage }: Props) {
  const [query, setQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((row) => {
      const id = String(row.id ?? "").toLowerCase();
      const responseText = toSafeText(row.llm_model_response).toLowerCase();
      const modelId = String(row.llm_model_id ?? "").toLowerCase();

      return id.includes(search) || responseText.includes(search) || modelId.includes(search);
    });
  }, [query, rows]);

  const summary =
    query.trim().length > 0
      ? `Showing ${filteredRows.length} of ${rows.length} LLM responses`
      : `Showing ${rows.length} LLM responses`;

  function rowKey(row: LlmResponseRow, index: number) {
    if (row.id !== null && row.id !== undefined) {
      return String(row.id);
    }
    return `row-${index}`;
  }

  function isExpanded(key: string) {
    return Boolean(expandedRows[key]);
  }

  function toggleExpanded(key: string) {
    setExpandedRows((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">LLM Responses</h1>
      <p className="mt-1 text-sm text-zinc-600">Read-only response logs from the `llm_model_responses` table.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700">{summary}</p>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID, response text, or model ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-24" />
            <col className="w-56" />
            <col className="w-[46%]" />
            <col className="w-36" />
            <col className="w-40" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Response Preview</th>
              <th className="px-4 py-3">Processing Time (s)</th>
              <th className="px-4 py-3">LLM Model ID</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-sm text-red-600" colSpan={6}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const key = rowKey(row, index);
                const expanded = isExpanded(key);
                const fullText = toSafeText(row.llm_model_response);

                return (
                  <Fragment key={key}>
                    <tr className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50">
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-800">{row.id ?? "-"}</td>
                      <td className="px-4 py-3.5 text-zinc-700">{formatUtcDatetime(row.created_datetime_utc)}</td>
                      <td className="px-4 py-3.5 text-zinc-700">{toPreview(row.llm_model_response)}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${timingToneClass(row.processing_time_seconds)}`}
                        >
                          {formatSeconds(row.processing_time_seconds)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.llm_model_id !== null && row.llm_model_id !== undefined && String(row.llm_model_id).length > 0 ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-700">
                            {String(row.llm_model_id)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(key)}
                          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/60">
                        <td colSpan={6} className="px-4 py-3.5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Full Response</p>
                          <pre className="max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-800 whitespace-pre-wrap break-words">
                            {fullText || "-"}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
