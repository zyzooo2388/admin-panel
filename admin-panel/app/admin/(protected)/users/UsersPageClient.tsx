"use client";

import { useMemo, useState } from "react";

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

function formatUtcDatetime(value: string | null, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
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
      <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
      <p className="mt-1 text-sm text-zinc-600">Read-only admin directory from the `public.profiles` table.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Loaded Users</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{rows.length.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Superadmins</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{superadminCount.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">In Study</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{inStudyCount.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Matrix Admins</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{matrixAdminCount.toLocaleString("en-US")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-800">{summaryText}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {totalProfilesText}
            {rows.length >= rowLimit ? ` (loaded first ${rowLimit})` : ""}
          </p>
        </div>

        <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email, first name, last name, or user ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
            aria-label="Sort users"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="email_asc">Email A-Z</option>
            <option value="email_desc">Email Z-A</option>
          </select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-48" />
            <col className="w-64" />
            <col className="w-56" />
            <col className="w-56" />
            <col className="w-56" />
            <col className="w-40" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">ID</th>
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
                const name = formatName(row.first_name, row.last_name);
                const rowKey = row.id.length > 0 ? row.id : `row-${index}`;

                return (
                  <tr key={rowKey} className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/80">
                    <td className="px-4 py-3.5">
                      {name ? <span className="font-medium text-zinc-900">{name}</span> : <span className="text-zinc-400">No name</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.email ? <span className="font-semibold text-zinc-900">{row.email}</span> : <span className="text-zinc-400">No email</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {row.is_superadmin ? (
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Superadmin
                          </span>
                        ) : null}
                        {row.is_in_study ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            In Study
                          </span>
                        ) : null}
                        {row.is_matrix_admin ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Matrix Admin
                          </span>
                        ) : null}
                        {!row.is_superadmin && !row.is_in_study && !row.is_matrix_admin ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            Standard user
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-700">{formatUtcDatetime(row.created_datetime_utc)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-700">
                      {formatUtcDatetime(row.modified_datetime_utc, "Never updated")}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-700" title={row.id}>
                      {truncateId(row.id)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-zinc-500" colSpan={6}>
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
