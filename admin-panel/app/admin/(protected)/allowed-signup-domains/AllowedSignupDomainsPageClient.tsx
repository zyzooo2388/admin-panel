"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  createAllowedSignupDomainInlineAction,
  deleteAllowedSignupDomainInlineAction,
  updateAllowedSignupDomainInlineAction,
} from "./actions";

type AllowedSignupDomainRow = {
  id: string | number;
  created_datetime_utc: string | null;
  apex_domain: string | null;
};

type AllowedSignupDomainsPageClientProps = {
  initialRows: AllowedSignupDomainRow[];
  initialError: string | null;
  initialSuccess: string | null;
};

const APEX_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const UTC_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function normalizeApexDomain(value: string) {
  return value.trim().toLowerCase();
}

function validateApexDomain(value: string) {
  if (!value) {
    return "Apex domain is required.";
  }
  if (!APEX_DOMAIN_PATTERN.test(value)) {
    return "Apex domain looks invalid. Example: columbia.edu";
  }

  return null;
}

function formatUtc(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${UTC_FORMATTER.format(parsed)} UTC`;
}

export default function AllowedSignupDomainsPageClient({
  initialRows,
  initialError,
  initialSuccess,
}: AllowedSignupDomainsPageClientProps) {
  const [rows, setRows] = useState<AllowedSignupDomainRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [createValue, setCreateValue] = useState("");
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess);
  const [isCreating, startCreateTransition] = useTransition();
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isRowPending, startRowTransition] = useTransition();

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      const id = String(row.id ?? "").toLowerCase();
      const apexDomain = String(row.apex_domain ?? "").toLowerCase();
      return id.includes(query) || apexDomain.includes(query);
    });
  }, [rows, search]);

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeApexDomain(createValue);
    const validationError = validateApexDomain(normalized);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    startCreateTransition(async () => {
      const result = await createAllowedSignupDomainInlineAction({ apexDomain: normalized });
      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => [result.row, ...previous]);
      setCreateValue("");
      setErrorMessage(null);
      setSuccessMessage(`Created domain "${result.row.apex_domain ?? normalized}".`);
    });
  };

  const onSaveRow = (id: string) => {
    const row = rows.find((candidate) => String(candidate.id) === id);
    const currentValue = row?.apex_domain ?? "";
    const normalized = normalizeApexDomain(draftById[id] ?? String(currentValue));
    const validationError = validateApexDomain(normalized);

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    startRowTransition(async () => {
      setIsSavingId(id);
      const result = await updateAllowedSignupDomainInlineAction({ id, apexDomain: normalized });
      setIsSavingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.map((candidate) => (String(candidate.id) === id ? result.row : candidate)));
      setDraftById((previous) => ({ ...previous, [id]: result.row.apex_domain ?? normalized }));
      setErrorMessage(null);
      setSuccessMessage(`Updated domain "${result.row.apex_domain ?? normalized}".`);
    });
  };

  const onDeleteRow = (id: string) => {
    if (!window.confirm("Delete this domain?")) {
      return;
    }

    startRowTransition(async () => {
      setIsDeletingId(id);
      const result = await deleteAllowedSignupDomainInlineAction({ id });
      setIsDeletingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.filter((candidate) => String(candidate.id) !== id));
      setErrorMessage(null);
      setSuccessMessage("Domain deleted.");
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Allowed Signup Domains</h1>
      <p className="mt-1 text-sm text-zinc-600">Manage allowed email signup domains (CRUD).</p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs text-zinc-600">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or apex domain..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900"
            />
          </label>

          <form onSubmit={onCreateSubmit} className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-zinc-600">
              <span className="mb-1 block font-medium">New Apex Domain</span>
              <input
                value={createValue}
                onChange={(event) => setCreateValue(event.target.value)}
                placeholder="columbia.edu"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900"
              />
            </label>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-10 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Apex Domain</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => {
                const rowId = String(row.id);
                const rowDraft = draftById[rowId] ?? String(row.apex_domain ?? "");
                const rowBusy = isRowPending && (isSavingId === rowId || isDeletingId === rowId);

                return (
                  <tr key={rowId} className="border-t border-zinc-100 align-top text-zinc-700 hover:bg-zinc-50/70">
                    <td className="px-4 py-3 font-mono text-xs">{rowId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-600">{formatUtc(row.created_datetime_utc)}</td>
                    <td className="px-4 py-3">
                      <input
                        value={rowDraft}
                        onChange={(event) =>
                          setDraftById((previous) => ({
                            ...previous,
                            [rowId]: event.target.value,
                          }))
                        }
                        className="h-9 w-full min-w-64 rounded-md border border-zinc-300 px-3 text-sm font-normal text-zinc-900"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveRow(rowId)}
                          disabled={rowBusy}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSavingId === rowId && isRowPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRow(rowId)}
                          disabled={rowBusy}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingId === rowId && isRowPending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-zinc-500">
                  No allowed signup domains found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
