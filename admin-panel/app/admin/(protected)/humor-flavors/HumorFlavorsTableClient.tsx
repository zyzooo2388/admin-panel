"use client";

import { useMemo, useState } from "react";

type HumorFlavorRow = {
  id: number | string | null;
  slug: string | null;
  description: string | null;
  created_datetime_utc: string | null;
};

type Props = {
  rows: HumorFlavorRow[];
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

function toFlavorName(slug: string | null): string {
  if (!slug) {
    return "-";
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function formatUtcDatetime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
}

function descriptionContainsDoNotUse(description: string | null): boolean {
  if (!description) {
    return false;
  }

  return description.toLowerCase().includes("do not use");
}

function descriptionPreview(description: string | null, maxLength = 220): string {
  if (!description) {
    return "-";
  }

  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "-";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function createdTimestamp(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export default function HumorFlavorsTableClient({ rows, errorMessage }: Props) {
  const [query, setQuery] = useState("");

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => createdTimestamp(b.created_datetime_utc) - createdTimestamp(a.created_datetime_utc)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return sortedRows;
    }

    return sortedRows.filter((row) => {
      const id = String(row.id ?? "").toLowerCase();
      const slug = String(row.slug ?? "").toLowerCase();
      const description = String(row.description ?? "").toLowerCase();

      return id.includes(search) || slug.includes(search) || description.includes(search);
    });
  }, [query, sortedRows]);

  const doNotUseCount = useMemo(
    () => sortedRows.filter((row) => descriptionContainsDoNotUse(row.description)).length,
    [sortedRows],
  );

  const summary =
    query.trim().length > 0
      ? `Showing ${filteredRows.length} of ${sortedRows.length} humor flavors`
      : `Showing ${sortedRows.length} humor flavors`;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Humor Flavors</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Read-only catalog of <code>public.humor_flavors</code> records.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Humor Flavors</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{sortedRows.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Do Not Use</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{doNotUseCount}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700">{summary}</p>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by flavor slug, description, or ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-44" />
            <col className="w-48" />
            <col className="w-[46%]" />
            <col className="w-52" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Flavor</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-sm text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const rowKey = row.id !== null && row.id !== undefined ? String(row.id) : `row-${index}`;
                const hasDoNotUse = descriptionContainsDoNotUse(row.description);
                const description = row.description?.trim() || "-";

                return (
                  <tr key={rowKey} className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/90">
                    <td className="px-4 py-4 font-medium text-zinc-900">{toFlavorName(row.slug)}</td>
                    <td className="px-4 py-4">
                      {row.slug ? (
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600">
                          {row.slug}
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-zinc-700" title={description}>
                      <div className="flex items-start gap-2">
                        <span>{descriptionPreview(row.description)}</span>
                        {hasDoNotUse ? (
                          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Do Not Use
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500">{formatUtcDatetime(row.created_datetime_utc)}</td>
                    <td className="px-4 py-4 font-mono text-xs text-zinc-500">{row.id ?? "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-zinc-500">
                  No humor flavors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
