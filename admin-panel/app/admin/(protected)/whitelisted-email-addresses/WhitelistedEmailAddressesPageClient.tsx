"use client";

import { useMemo, useState, useTransition } from "react";

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

function formatUtc(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${UTC_FORMATTER.format(parsed)} UTC`;
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
      <h1 className="text-2xl font-semibold text-zinc-900">Whitelisted Email Addresses</h1>
      <p className="mt-1 text-sm text-zinc-600">Manage whitelisted email addresses (CRUD).</p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <label className="block text-xs text-zinc-600">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or email address..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-zinc-600">
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900"
              />
            </label>
            <button
              type="button"
              onClick={onCreate}
              disabled={isCreating}
              className="inline-flex h-10 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Modified At</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Actions</th>
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
                  <tr key={rowId} className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/80">
                    <td className="px-4 py-4 font-mono text-xs text-zinc-500">{rowId}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-zinc-600">{createdAtLabel}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-zinc-600">
                      {modifiedAtLabel ? modifiedAtLabel : <span className="text-zinc-400">Never modified</span>}
                    </td>
                    <td className="px-4 py-4">
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
                        className="w-full min-w-72 rounded-md border border-zinc-300 px-3 py-2.5 text-sm font-normal text-zinc-900"
                      />
                    </td>
                    <td className="px-4 py-4">
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
                <td colSpan={5} className="px-4 py-6 text-zinc-500">
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
