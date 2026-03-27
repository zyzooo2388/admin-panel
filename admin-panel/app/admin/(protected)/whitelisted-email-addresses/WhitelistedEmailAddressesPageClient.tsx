"use client";

import { useMemo, useState, useTransition } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

import {
  createWhitelistedEmailAddressInlineAction,
  deleteWhitelistedEmailAddressInlineAction,
  updateWhitelistedEmailAddressInlineAction,
} from "./actions";

type WhitelistedEmailAddressRow = {
  id: string | number;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  email_address: string | null;
};

type WhitelistedEmailAddressesPageClientProps = {
  initialRows: WhitelistedEmailAddressRow[];
  initialError: string | null;
  initialSuccess: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function validateEmailAddress(value: string) {
  if (!value) {
    return "Email address is required.";
  }

  if (!EMAIL_PATTERN.test(value)) {
    return "Email address looks invalid. Example: name@example.com";
  }

  return null;
}

function hasDuplicateEmail(rows: WhitelistedEmailAddressRow[], emailAddress: string, excludeId?: string) {
  return rows.some((row) => {
    if (excludeId && String(row.id) === excludeId) {
      return false;
    }

    return normalizeEmailAddress(String(row.email_address ?? "")) === emailAddress;
  });
}

function formatUtc(value: string | null) {
  const formatted = formatUtcDate(value, { emptyFallback: "", preserveInvalid: true });
  return formatted || null;
}

export default function WhitelistedEmailAddressesPageClient({
  initialRows,
  initialError,
  initialSuccess,
}: WhitelistedEmailAddressesPageClientProps) {
  const [rows, setRows] = useState<WhitelistedEmailAddressRow[]>(initialRows);
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
      const emailAddress = String(row.email_address ?? "").toLowerCase();
      return id.includes(query) || emailAddress.includes(query);
    });
  }, [rows, search]);

  const onCreate = () => {
    const normalized = normalizeEmailAddress(createValue);
    const validationError = validateEmailAddress(normalized);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    if (hasDuplicateEmail(rows, normalized)) {
      setErrorMessage("This email is already in the whitelist.");
      setSuccessMessage(null);
      return;
    }

    startCreateTransition(async () => {
      const result = await createWhitelistedEmailAddressInlineAction({ emailAddress: normalized });
      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => [result.row, ...previous]);
      setCreateValue("");
      setErrorMessage(null);
      setSuccessMessage(`Created email address "${result.row.email_address ?? normalized}".`);
    });
  };

  const onSaveRow = (id: string) => {
    const row = rows.find((candidate) => String(candidate.id) === id);
    const currentValue = row?.email_address ?? "";
    const normalized = normalizeEmailAddress(draftById[id] ?? String(currentValue));
    const validationError = validateEmailAddress(normalized);

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    if (hasDuplicateEmail(rows, normalized, id)) {
      setErrorMessage("That email is already used by another whitelist entry.");
      setSuccessMessage(null);
      return;
    }

    startRowTransition(async () => {
      setIsSavingId(id);
      const result = await updateWhitelistedEmailAddressInlineAction({ id, emailAddress: normalized });
      setIsSavingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.map((candidate) => (String(candidate.id) === id ? result.row : candidate)));
      setDraftById((previous) => ({ ...previous, [id]: result.row.email_address ?? normalized }));
      setErrorMessage(null);
      setSuccessMessage(`Updated email address "${result.row.email_address ?? normalized}".`);
    });
  };

  const onDeleteRow = (id: string) => {
    if (!window.confirm("Delete this email address?")) {
      return;
    }

    startRowTransition(async () => {
      setIsDeletingId(id);
      const result = await deleteWhitelistedEmailAddressInlineAction({ id });
      setIsDeletingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.filter((candidate) => String(candidate.id) !== id));
      setErrorMessage(null);
      setSuccessMessage("Deleted email address.");
    });
  };

  return (
    <div>
      <h1 className="admin-page-title">Whitelisted Email Addresses</h1>
      <p className="admin-page-description">Manage whitelisted email addresses (CRUD).</p>

      {errorMessage ? <p className="admin-alert-danger mt-4">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert-success mt-4">{successMessage}</p> : null}

      <section className="admin-card mt-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <label className="block text-xs text-slate-500">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or email address..."
              className="admin-input"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-slate-500">
              <span className="mb-1 block font-medium">New Email Address</span>
              <input
                value={createValue}
                onChange={(event) => setCreateValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onCreate();
                  }
                }}
                placeholder="name@example.com"
                className="admin-input"
              />
            </label>
            <button
              type="button"
              onClick={onCreate}
              disabled={isCreating}
              className="admin-button-primary inline-flex h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-table-wrap mt-6">
        <table className="admin-table min-w-full">
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Modified At</th>
              <th className="px-5 py-3.5">Email Address</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => {
                const rowId = String(row.id);
                const rowDraft = draftById[rowId] ?? String(row.email_address ?? "");
                const rowBusy = isRowPending && (isSavingId === rowId || isDeletingId === rowId);
                const createdAtLabel = formatUtc(row.created_datetime_utc) ?? "Unknown";
                const modifiedAtLabel = formatUtc(row.modified_datetime_utc);

                return (
                  <tr key={rowId}>
                    <td className="px-5 py-4.5 font-mono text-xs text-slate-500">{rowId}</td>
                    <td className="px-5 py-4.5 whitespace-nowrap text-xs text-slate-500">{createdAtLabel}</td>
                    <td className="px-5 py-4.5 whitespace-nowrap text-xs text-slate-500">
                      {modifiedAtLabel ? modifiedAtLabel : <span className="text-slate-400">Never modified</span>}
                    </td>
                    <td className="px-5 py-4.5">
                      <input
                        value={rowDraft}
                        onChange={(event) =>
                          setDraftById((previous) => ({
                            ...previous,
                            [rowId]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onSaveRow(rowId);
                          }
                        }}
                        className="admin-input min-w-72"
                      />
                    </td>
                    <td className="px-5 py-4.5">
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
                <td colSpan={5} className="px-5 py-6 text-slate-500">
                  No whitelisted email addresses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
