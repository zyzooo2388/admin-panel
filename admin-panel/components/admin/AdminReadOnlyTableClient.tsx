"use client";

import { useMemo, useState } from "react";

import AdminDataCell from "@/components/admin/AdminDataCell";
import { formatUtcDate } from "@/lib/dates/formatUtcDate";

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
      const formatted = formatUtcDate(value, { emptyFallback: "", preserveInvalid: true });
      if (formatted) {
        return formatted;
      }
    }

    return <AdminDataCell value={value} />;
  }

  function resolveColumnLabel(column: string) {
    return columnLabels?.[column] ?? column;
  }

  return (
    <div>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-description">{description}</p>

      {showStatsBar ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="admin-stat-card px-5 py-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total loaded</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{rows.length}</p>
          </div>
          <div className="admin-stat-card px-5 py-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Newest record ID</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900">{newestRecordId}</p>
          </div>
        </div>
      ) : null}

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-summary-pill">
          Showing {filteredRows.length} of {rows.length} rows
        </div>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="admin-input"
          />
        </div>
      </section>

      {rowLimit ? (
        <p className="mt-3 text-xs text-slate-500">
          {rows.length >= rowLimit ? `Showing first ${rowLimit} rows.` : `Showing ${rows.length} loaded rows.`}
        </p>
      ) : null}

      <div className="admin-table-wrap mt-6">
        <table className="admin-table">
          <thead
            className={stickyHeader ? "sticky top-0 z-10" : ""}
          >
            <tr>
              {columns.map((column) => (
                <th key={column}>
                  {resolveColumnLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="text-red-600" colSpan={Math.max(columns.length, 1)}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const keyValue = row.id ?? `row-${index}`;
                const key = typeof keyValue === "string" || typeof keyValue === "number" ? String(keyValue) : `row-${index}`;

                return (
                  <tr key={key}>
                    {columns.map((column) => {
                      const value = row[column];
                      const isMonospace = monospaceColumnSet.has(column);
                      const isChip = chipColumnSet.has(column);

                      return (
                        <td key={`${key}-${column}`} className={isMonospace ? "font-mono text-xs text-slate-800" : ""}>
                          {isChip && value !== null && value !== undefined && String(value).length > 0 ? (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
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
                <td className="text-slate-500" colSpan={Math.max(columns.length, 1)}>
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
