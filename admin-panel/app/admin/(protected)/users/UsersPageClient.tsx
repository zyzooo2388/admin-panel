"use client";

import { useMemo, useState } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

type ProfileRow = {
  id: string;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean | null;
  is_in_study: boolean | null;
  is_matrix_admin: boolean | null;
};

type Props = {
  rows: ProfileRow[];
  errorMessage: string | null;
  totalCount: number | null;
  rowLimit: number;
};

type SortKey = "created_desc" | "created_asc" | "email_asc" | "email_desc";

function formatUtcDatetime(value: string | null, fallback = "-") {
  return formatUtcDate(value, { emptyFallback: fallback, invalidFallback: fallback });
}

function formatName(firstName: string | null, lastName: string | null) {
  const parts = [firstName?.trim() ?? "", lastName?.trim() ?? ""].filter((part) => part.length > 0);
  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ");
}

function truncateId(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function sortRows(rows: ProfileRow[], sortKey: SortKey) {
  const copied = [...rows];

  copied.sort((a, b) => {
    if (sortKey === "email_asc" || sortKey === "email_desc") {
      const aEmail = (a.email ?? "").toLowerCase();
      const bEmail = (b.email ?? "").toLowerCase();
      const compared = aEmail.localeCompare(bEmail);
      return sortKey === "email_asc" ? compared : -compared;
    }

    const aTime = a.created_datetime_utc ? new Date(a.created_datetime_utc).getTime() : Number.NEGATIVE_INFINITY;
    const bTime = b.created_datetime_utc ? new Date(b.created_datetime_utc).getTime() : Number.NEGATIVE_INFINITY;

    if (sortKey === "created_asc") {
      return aTime - bTime;
    }

    return bTime - aTime;
  });

  return copied;
}

function flagCount(rows: ProfileRow[], predicate: (row: ProfileRow) => boolean) {
  return rows.reduce((count, row) => (predicate(row) ? count + 1 : count), 0);
}

export default function UsersPageClient({ rows, errorMessage, totalCount, rowLimit }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const sortedRows = useMemo(() => sortRows(rows, sortKey), [rows, sortKey]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return sortedRows;
    }

    return sortedRows.filter((row) => {
      const email = (row.email ?? "").toLowerCase();
      const firstName = (row.first_name ?? "").toLowerCase();
      const lastName = (row.last_name ?? "").toLowerCase();
      const id = row.id.toLowerCase();

      return email.includes(search) || firstName.includes(search) || lastName.includes(search) || id.includes(search);
    });
  }, [query, sortedRows]);

  const summaryText = query.trim().length > 0 ? `Showing ${filteredRows.length} users` : `Showing ${rows.length} users`;

  const totalProfilesText =
    typeof totalCount === "number" ? `${totalCount.toLocaleString("en-US")} total profiles` : "Total profile count unavailable";

  const superadminCount = useMemo(() => flagCount(rows, (row) => row.is_superadmin === true), [rows]);
  const inStudyCount = useMemo(() => flagCount(rows, (row) => row.is_in_study === true), [rows]);
  const matrixAdminCount = useMemo(() => flagCount(rows, (row) => row.is_matrix_admin === true), [rows]);

  return (
    <div>
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-description">Read-only admin directory from the `public.profiles` table.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Loaded Users</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{rows.length.toLocaleString("en-US")}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Superadmins</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{superadminCount.toLocaleString("en-US")}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In Study</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{inStudyCount.toLocaleString("en-US")}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Matrix Admins</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{matrixAdminCount.toLocaleString("en-US")}</p>
        </div>
      </div>

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-summary-pill">{summaryText}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalProfilesText}
            {rows.length >= rowLimit ? ` (loaded first ${rowLimit})` : ""}
          </p>
        </div>

        <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email, first name, last name, or user ID..."
            className="admin-input"
          />
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="admin-input"
            aria-label="Sort users"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="email_asc">Email A-Z</option>
            <option value="email_desc">Email Z-A</option>
          </select>
        </div>
      </section>

      <div className="admin-table-wrap mt-5">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-48" />
            <col className="w-64" />
            <col className="w-56" />
            <col className="w-56" />
            <col className="w-56" />
            <col className="w-40" />
          </colgroup>
          <thead className="sticky top-0 z-10 text-left">
            <tr>
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Flags</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Updated</th>
              <th className="px-5 py-3.5">ID</th>
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
                const name = formatName(row.first_name, row.last_name);
                const rowKey = row.id.length > 0 ? row.id : `row-${index}`;

                return (
                  <tr key={rowKey}>
                    <td className="px-5 py-3.5">
                      {name ? <span className="font-medium text-slate-900">{name}</span> : <span className="text-slate-400">No name</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {row.email ? <span className="font-semibold text-slate-900">{row.email}</span> : <span className="text-slate-400">No email</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {row.is_superadmin ? (
                          <span className="admin-badge border-blue-200 bg-blue-50/90 text-blue-700">
                            Superadmin
                          </span>
                        ) : null}
                        {row.is_in_study ? (
                          <span className="admin-badge border-emerald-200 bg-emerald-50/90 text-emerald-700">
                            In Study
                          </span>
                        ) : null}
                        {row.is_matrix_admin ? (
                          <span className="admin-badge border-amber-200 bg-amber-50/90 text-amber-700">
                            Matrix Admin
                          </span>
                        ) : null}
                        {!row.is_superadmin && !row.is_in_study && !row.is_matrix_admin ? (
                          <span className="admin-badge">
                            Standard user
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{formatUtcDatetime(row.created_datetime_utc)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      {formatUtcDatetime(row.modified_datetime_utc, "Never updated")}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700" title={row.id}>
                      {truncateId(row.id)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={6}>
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
