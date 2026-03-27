"use client";

import { Fragment, useMemo, useState } from "react";

import CopyButton from "@/components/admin/CopyButton";
import { formatUtcDate } from "@/lib/dates/formatUtcDate";

export type CaptionRequestRow = {
  id: string | null;
  created_datetime_utc: string | null;
  profile_id: string | null;
  image_id: string | null;
  user_email: string | null;
};

type Props = {
  rows: CaptionRequestRow[];
  errorMessage: string | null;
  totalCount: number | null;
  requestsTodayCount: number | null;
  rowLimit: number;
};

type QuickFilterKey = "all" | "today" | "with-user" | "missing-user" | "missing-image";

function formatUtcDatetime(value: string | null): string {
  return formatUtcDate(value, { emptyFallback: "Unknown", invalidFallback: "Unknown", includeSeconds: false });
}

function shortenUuid(value: string | null, start = 8, end = 4): string {
  if (!value) {
    return "None";
  }

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function normalizeSearch(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.toLowerCase();
}

function isTodayUtc(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

function rowMatchesQuickFilter(row: CaptionRequestRow, filter: QuickFilterKey): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "today") {
    return isTodayUtc(row.created_datetime_utc);
  }

  if (filter === "with-user") {
    return Boolean(row.profile_id);
  }

  if (filter === "missing-user") {
    return !row.profile_id;
  }

  if (filter === "missing-image") {
    return !row.image_id;
  }

  return true;
}

export default function CaptionRequestsTableClient({
  rows,
  errorMessage,
  totalCount,
  requestsTodayCount,
  rowLimit,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (!rowMatchesQuickFilter(row, quickFilter)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableValues = [
        normalizeSearch(row.id),
        normalizeSearch(row.profile_id),
        normalizeSearch(row.image_id),
        normalizeSearch(row.user_email),
      ];

      return searchableValues.some((value) => value.includes(search));
    });
  }, [query, quickFilter, rows]);

  const uniqueLoadedUsers = useMemo(
    () => new Set(rows.map((row) => row.profile_id).filter((value): value is string => Boolean(value))).size,
    [rows],
  );

  const quickFilterCounts = useMemo(
    () => ({
      all: rows.length,
      today: rows.filter((row) => isTodayUtc(row.created_datetime_utc)).length,
      "with-user": rows.filter((row) => Boolean(row.profile_id)).length,
      "missing-user": rows.filter((row) => !row.profile_id).length,
      "missing-image": rows.filter((row) => !row.image_id).length,
    }),
    [rows],
  );

  const summary = useMemo(() => {
    const matched = filteredRows.length.toLocaleString("en-US");
    const loaded = rows.length.toLocaleString("en-US");

    if (query.trim().length > 0 || quickFilter !== "all") {
      if (typeof totalCount === "number") {
        return `Showing ${matched} of ${loaded} loaded caption requests (${totalCount.toLocaleString("en-US")} total).`;
      }

      return `Showing ${matched} of ${loaded} loaded caption requests.`;
    }

    if (typeof totalCount === "number") {
      return `Showing ${loaded} caption requests (${totalCount.toLocaleString("en-US")} total).`;
    }

    return `Showing ${loaded} caption requests.`;
  }, [filteredRows.length, query, quickFilter, rows.length, totalCount]);

  function rowKey(row: CaptionRequestRow, index: number): string {
    if (row.id) {
      return row.id;
    }

    return `row-${index}`;
  }

  function toggleExpanded(key: string) {
    setExpandedRowKey((current) => (current === key ? null : key));
  }

  return (
    <div>
      <h1 className="admin-page-title">Caption Requests</h1>
      <p className="admin-page-description">
        Read-only request log from <code>public.caption_requests</code>, sorted newest first.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Requests</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalCount ?? rows.length}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Requests Today</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{requestsTodayCount ?? "-"}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unique Requesting Users</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{uniqueLoadedUsers.toLocaleString("en-US")}</p>
          <p className="mt-0.5 text-xs text-slate-500">Based on loaded rows</p>
        </div>
      </div>

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-summary-pill">{summary}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Search by request ID, profile ID, image ID, or resolved email.
            {rows.length >= rowLimit ? ` Loaded first ${rowLimit.toLocaleString("en-US")} rows.` : ""}
          </p>
        </div>

        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search request ID, user email, profile ID, or image ID..."
            className="admin-input"
          />
        </div>
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "today", label: "Today" },
          { key: "with-user", label: "With User" },
          { key: "missing-user", label: "Missing User" },
          { key: "missing-image", label: "Missing Image" },
        ].map((filterOption) => {
          const key = filterOption.key as QuickFilterKey;
          const active = key === quickFilter;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setQuickFilter(key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                active
                  ? "admin-filter-chip admin-filter-chip-active"
                  : "admin-filter-chip hover:border-slate-300 hover:bg-white/90"
              }`}
            >
              <span>{filterOption.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-indigo-600/90" : "bg-slate-100"}`}>
                {quickFilterCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-500">Click a row to inspect the full identifiers.</p>

      <div className="admin-table-wrap mt-5">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-48" />
            <col className="w-52" />
            <col className="w-[34%]" />
            <col className="w-52" />
          </colgroup>
          <thead className="sticky top-0 z-10 text-left">
            <tr>
              <th className="px-5 py-3.5">Request ID</th>
              <th className="px-5 py-3.5">Requested At</th>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Image ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-5 py-4.5 text-sm text-red-600" colSpan={4}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const key = rowKey(row, index);
                const isExpanded = expandedRowKey === key;

                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(key)}
                    >
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs text-slate-500" title={row.id ?? "None"}>
                            {shortenUuid(row.id)}
                          </p>
                          <CopyButton value={row.id} label="Copy" />
                        </div>
                      </td>
                      <td className="px-5 py-4.5">
                        <p className="text-sm font-medium text-slate-900">{formatUtcDatetime(row.created_datetime_utc)}</p>
                        <p className="mt-1 text-xs text-slate-500">UTC</p>
                      </td>
                      <td className="px-5 py-4.5">
                        {row.user_email ? (
                          <div>
                            <p className="font-medium text-slate-900">{row.user_email}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <p className="font-mono text-xs text-slate-500" title={row.profile_id ?? "None"}>
                                {shortenUuid(row.profile_id)}
                              </p>
                              <CopyButton value={row.profile_id} label="Copy" />
                            </div>
                          </div>
                        ) : row.profile_id ? (
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-slate-500" title={row.profile_id}>
                              {shortenUuid(row.profile_id)}
                            </p>
                            <CopyButton value={row.profile_id} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-slate-400">No user</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {row.image_id ? (
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-slate-500" title={row.image_id}>
                              {shortenUuid(row.image_id)}
                            </p>
                            <CopyButton value={row.image_id} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-slate-400">No image</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="bg-white/45">
                        <td colSpan={4} className="px-5 py-4.5">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Request Details</p>
                              <div className="admin-soft-panel mt-2 p-3 text-sm text-slate-800">
                                <p className="font-semibold text-slate-900">{row.user_email ?? "No resolved email"}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                  Caption request created at {formatUtcDatetime(row.created_datetime_utc)}.
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2 text-xs text-slate-500">
                              <p>
                                <span className="font-semibold text-slate-700">Request ID:</span> {row.id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Profile ID:</span> {row.profile_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Image ID:</span> {row.image_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Requested At:</span> {formatUtcDatetime(row.created_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Resolved User:</span> {row.user_email ?? "Unavailable"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={4}>
                  No caption requests match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
