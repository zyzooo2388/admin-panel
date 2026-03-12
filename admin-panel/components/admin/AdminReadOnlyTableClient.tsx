"use client";

import { useMemo, useState } from "react";

import AdminDataCell from "@/components/admin/AdminDataCell";

type Props = {
  title: string;
  description: string;
  rows: Record<string, unknown>[];
  columns: string[];
  errorMessage: string | null;
  columnLabels?: Record<string, string>;
  searchColumns?: string[];
  utcDateColumns?: string[];
  monospaceColumns?: string[];
  chipColumns?: string[];
  stickyHeader?: boolean;
  rowLimit?: number;
  showStatsBar?: boolean;
  searchPlaceholder?: string;
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

function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase();
  }

  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return String(value).toLowerCase();
  }
}

export default function AdminReadOnlyTableClient({
  title,
  description,
  rows,
  columns,
  errorMessage,
  columnLabels,
  searchColumns,
  utcDateColumns,
  monospaceColumns,
  chipColumns,
  stickyHeader = false,
  rowLimit,
  showStatsBar = false,
  searchPlaceholder = "Search rows...",
}: Props) {
  const [query, setQuery] = useState("");

  const searchableColumns = useMemo(
    () => searchColumns?.filter((column) => columns.includes(column)) ?? columns,
    [columns, searchColumns],
  );

  const utcColumnSet = useMemo(() => new Set(utcDateColumns ?? []), [utcDateColumns]);
  const monospaceColumnSet = useMemo(() => new Set(monospaceColumns ?? []), [monospaceColumns]);
  const chipColumnSet = useMemo(() => new Set(chipColumns ?? []), [chipColumns]);

  const newestRecordId = useMemo(() => {
    const value = rows[0]?.id;
    if (value === null || value === undefined) {
      return "-";
    }
    return String(value);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((row) => searchableColumns.some((column) => normalizeSearchValue(row[column]).includes(search)));
  }, [query, rows, searchableColumns]);

  function renderCellValue(column: string, value: unknown) {
    if (utcColumnSet.has(column)) {
      const date = new Date(String(value ?? ""));
      if (!Number.isNaN(date.getTime())) {
        return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
      }
    }

    return <AdminDataCell value={value} />;
  }

  function resolveColumnLabel(column: string) {
    return columnLabels?.[column] ?? column;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>

      {showStatsBar ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total loaded</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Newest record ID</p>
            <p className="mt-1 font-mono text-lg font-semibold text-zinc-900">{newestRecordId}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 w-full max-w-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {rowLimit ? (
        <p className="mt-3 text-xs text-zinc-500">
          {rows.length >= rowLimit ? `Showing first ${rowLimit} rows.` : `Showing ${rows.length} loaded rows.`}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead
            className={`bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500 ${stickyHeader ? "sticky top-0 z-10" : ""}`}
          >
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {resolveColumnLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-red-600" colSpan={Math.max(columns.length, 1)}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const keyValue = row.id ?? `row-${index}`;
                const key = typeof keyValue === "string" || typeof keyValue === "number" ? String(keyValue) : `row-${index}`;

                return (
                  <tr key={key} className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/80">
                    {columns.map((column) => {
                      const value = row[column];
                      const isMonospace = monospaceColumnSet.has(column);
                      const isChip = chipColumnSet.has(column);

                      return (
                        <td key={`${key}-${column}`} className={`px-4 py-3.5 ${isMonospace ? "font-mono text-xs text-zinc-800" : ""}`}>
                          {isChip && value !== null && value !== undefined && String(value).length > 0 ? (
                            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-700">
                              {String(value)}
                            </span>
                          ) : (
                            renderCellValue(column, value)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={Math.max(columns.length, 1)}>
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
