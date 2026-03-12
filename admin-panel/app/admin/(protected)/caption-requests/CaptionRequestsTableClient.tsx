"use client";

import { Fragment, useMemo, useState } from "react";

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

const UTC_DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatUtcDatetime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
}

function shortenUuid(value: string | null, start = 8, end = 4) {
  if (!value) {
    return "None";
  }

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function normalizeSearch(value: string | null) {
  if (!value) {
    return "";
  }

  return value.toLowerCase();
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

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((row) => {
      const searchableValues = [
        normalizeSearch(row.id),
        normalizeSearch(row.profile_id),
        normalizeSearch(row.image_id),
        normalizeSearch(row.user_email),
      ];

      return searchableValues.some((value) => value.includes(search));
    });
  }, [query, rows]);

  const uniqueLoadedUsers = useMemo(
    () => new Set(rows.map((row) => row.profile_id).filter((value): value is string => Boolean(value))).size,
    [rows],
  );

  const summary = useMemo(() => {
    const matched = filteredRows.length.toLocaleString("en-US");
    const loaded = rows.length.toLocaleString("en-US");

    if (query.trim().length > 0) {
      if (typeof totalCount === "number") {
        return `Showing ${matched} of ${loaded} loaded caption requests (${totalCount.toLocaleString("en-US")} total).`;
      }

      return `Showing ${matched} of ${loaded} loaded caption requests.`;
    }

    if (typeof totalCount === "number") {
      return `Showing ${loaded} caption requests (${totalCount.toLocaleString("en-US")} total).`;
    }

    return `Showing ${loaded} caption requests.`;
  }, [filteredRows.length, query, rows.length, totalCount]);

  function rowKey(row: CaptionRequestRow, index: number) {
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
      <h1 className="text-2xl font-semibold text-zinc-900">Caption Requests</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Read-only request log from <code>public.caption_requests</code>, sorted newest first.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Requests</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{totalCount ?? rows.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Requests Today</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{requestsTodayCount ?? "-"}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Unique Requesting Users</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{uniqueLoadedUsers.toLocaleString("en-US")}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Based on loaded rows</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-800">{summary}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Search by request ID, profile ID, image ID, or resolved email.
            {rows.length >= rowLimit ? ` Loaded first ${rowLimit.toLocaleString("en-US")} rows.` : ""}
          </p>
        </div>

        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search request ID, user email, profile ID, or image ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">Click a row to inspect the full identifiers.</p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-44" />
            <col className="w-48" />
            <col className="w-[32%]" />
            <col className="w-44" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Requested At</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Image ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-sm text-red-600" colSpan={4}>
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
                      className="cursor-pointer border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/90"
                      onClick={() => toggleExpanded(key)}
                    >
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-mono text-xs text-zinc-500" title={row.id ?? "None"}>
                            {shortenUuid(row.id)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-zinc-900">{formatUtcDatetime(row.created_datetime_utc)}</p>
                        <p className="mt-1 text-xs text-zinc-500">UTC</p>
                      </td>
                      <td className="px-4 py-4">
                        {row.user_email ? (
                          <div>
                            <p className="font-medium text-zinc-900">{row.user_email}</p>
                            <p className="mt-1 font-mono text-xs text-zinc-500" title={row.profile_id ?? "None"}>
                              {shortenUuid(row.profile_id)}
                            </p>
                          </div>
                        ) : row.profile_id ? (
                          <p className="font-mono text-xs text-zinc-500" title={row.profile_id}>
                            {shortenUuid(row.profile_id)}
                          </p>
                        ) : (
                          <span className="text-zinc-400">No user</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.image_id ? (
                          <p className="font-mono text-xs text-zinc-500" title={row.image_id}>
                            {shortenUuid(row.image_id)}
                          </p>
                        ) : (
                          <span className="text-zinc-400">No image</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/70">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Request Details</p>
                              <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800">
                                <p className="font-semibold text-zinc-900">{row.user_email ?? "No resolved email"}</p>
                                <p className="mt-2 text-xs text-zinc-600">
                                  Caption request created at {formatUtcDatetime(row.created_datetime_utc)}.
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2 text-xs text-zinc-600">
                              <p>
                                <span className="font-semibold text-zinc-700">Request ID:</span> {row.id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Profile ID:</span> {row.profile_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Image ID:</span> {row.image_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Requested At:</span> {formatUtcDatetime(row.created_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Resolved User:</span> {row.user_email ?? "Unavailable"}
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
                <td className="px-4 py-8 text-center text-sm text-zinc-500" colSpan={4}>
                  No caption requests match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
