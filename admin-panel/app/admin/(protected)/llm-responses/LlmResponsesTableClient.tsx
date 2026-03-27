"use client";

import { Fragment, useMemo, useState } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

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
  return formatUtcDate(value);
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
    return "border-slate-200 bg-slate-100 text-slate-500";
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
      <h1 className="admin-page-title">LLM Responses</h1>
      <p className="admin-page-description">Read-only response logs from the `llm_model_responses` table.</p>

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="admin-summary-pill">{summary}</p>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID, response text, or model ID..."
            className="admin-input"
          />
        </div>
      </section>

      <div className="admin-table-wrap mt-5">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-24" />
            <col className="w-56" />
            <col className="w-[46%]" />
            <col className="w-36" />
            <col className="w-40" />
            <col className="w-24" />
          </colgroup>
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Response Preview</th>
              <th className="px-5 py-3.5">Processing Time (s)</th>
              <th className="px-5 py-3.5">LLM Model ID</th>
              <th className="px-5 py-3.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-5 py-4.5 text-sm text-red-600" colSpan={6}>
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
                    <tr>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-800">{row.id ?? "-"}</td>
                      <td className="px-5 py-3.5 text-slate-700">{formatUtcDatetime(row.created_datetime_utc)}</td>
                      <td className="px-5 py-3.5 text-slate-700">{toPreview(row.llm_model_response)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`admin-badge font-mono ${timingToneClass(row.processing_time_seconds)}`}
                        >
                          {formatSeconds(row.processing_time_seconds)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {row.llm_model_id !== null && row.llm_model_id !== undefined && String(row.llm_model_id).length > 0 ? (
                          <span className="admin-mono-badge">
                            {String(row.llm_model_id)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(key)}
                          className="admin-button-secondary px-2.5 py-1 text-xs"
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-white/45">
                        <td colSpan={6} className="px-5 py-3.5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Full Response</p>
                          <pre className="admin-soft-panel max-h-80 overflow-auto p-3 text-xs leading-5 text-slate-800 whitespace-pre-wrap break-words">
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
                <td className="px-5 py-4.5 text-slate-500" colSpan={6}>
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
