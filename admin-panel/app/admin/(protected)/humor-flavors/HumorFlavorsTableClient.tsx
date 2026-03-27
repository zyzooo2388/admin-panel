"use client";

import { useMemo, useState } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

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
  return formatUtcDate(value);
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
      <h1 className="admin-page-title">Humor Flavors</h1>
      <p className="admin-page-description">
        Read-only catalog of <code>public.humor_flavors</code> records.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Humor Flavors</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{sortedRows.length}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Do Not Use</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{doNotUseCount}</p>
        </div>
      </div>

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="admin-summary-pill">{summary}</p>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by flavor slug, description, or ID..."
            className="admin-input"
          />
        </div>
      </section>

      <div className="admin-table-wrap mt-5">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-44" />
            <col className="w-48" />
            <col className="w-[46%]" />
            <col className="w-52" />
            <col className="w-24" />
          </colgroup>
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">Flavor</th>
              <th className="px-5 py-3.5">Slug</th>
              <th className="px-5 py-3.5">Description</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td colSpan={5} className="px-5 py-4.5 text-sm text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const rowKey = row.id !== null && row.id !== undefined ? String(row.id) : `row-${index}`;
                const hasDoNotUse = descriptionContainsDoNotUse(row.description);
                const description = row.description?.trim() || "-";

                return (
                  <tr key={rowKey}>
                    <td className="px-5 py-4.5 font-medium text-slate-900">{toFlavorName(row.slug)}</td>
                    <td className="px-5 py-4.5">
                      {row.slug ? (
                        <span className="admin-mono-badge">
                          {row.slug}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4.5 text-slate-700" title={description}>
                      <div className="flex items-start gap-2">
                        <span>{descriptionPreview(row.description)}</span>
                        {hasDoNotUse ? (
                          <span className="admin-badge shrink-0 border-amber-200 bg-amber-50/90 text-[10px] text-amber-700">
                            Do Not Use
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4.5 text-xs text-slate-500">{formatUtcDatetime(row.created_datetime_utc)}</td>
                    <td className="px-5 py-4.5 font-mono text-xs text-slate-500">{row.id ?? "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-4.5 text-slate-500">
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
