"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

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
  return formatUtcDate(value, { preserveInvalid: true });
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
      <h1 className="admin-page-title">Allowed Signup Domains</h1>
      <p className="admin-page-description">Manage allowed email signup domains (CRUD).</p>

      {errorMessage ? <p className="admin-alert-danger mt-4">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert-success mt-4">{successMessage}</p> : null}

      <section className="admin-card mt-6 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs text-slate-500">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or apex domain..."
              className="admin-input"
            />
          </label>

          <form onSubmit={onCreateSubmit} className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-slate-500">
              <span className="mb-1 block font-medium">New Apex Domain</span>
              <input
                value={createValue}
                onChange={(event) => setCreateValue(event.target.value)}
                placeholder="columbia.edu"
                className="admin-input"
              />
            </label>
            <button
              type="submit"
              disabled={isCreating}
              className="admin-button-primary inline-flex h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      </section>

      <section className="admin-table-wrap mt-6">
        <table className="admin-table min-w-full">
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Apex Domain</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => {
                const rowId = String(row.id);
                const rowDraft = draftById[rowId] ?? String(row.apex_domain ?? "");
                const rowBusy = isRowPending && (isSavingId === rowId || isDeletingId === rowId);

                return (
                  <tr key={rowId}>
                    <td className="px-5 py-3.5 font-mono text-xs">{rowId}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">{formatUtc(row.created_datetime_utc)}</td>
                    <td className="px-5 py-3.5">
                      <input
                        value={rowDraft}
                        onChange={(event) =>
                          setDraftById((previous) => ({
                            ...previous,
                            [rowId]: event.target.value,
                          }))
                        }
                        className="admin-input h-9 min-w-64"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveRow(rowId)}
                          disabled={rowBusy}
                          className="admin-button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSavingId === rowId && isRowPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRow(rowId)}
                          disabled={rowBusy}
                          className="admin-button-danger px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
                <td colSpan={4} className="px-5 py-6 text-slate-500">
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
