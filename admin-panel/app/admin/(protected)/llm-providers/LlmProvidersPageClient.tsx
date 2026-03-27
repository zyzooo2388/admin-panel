"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

import { formatUtcDate } from "@/lib/dates/formatUtcDate";

import { createLlmProviderInlineAction, deleteLlmProviderInlineAction, updateLlmProviderInlineAction } from "./actions";

type LlmProviderRow = {
  id: string | number;
  created_datetime_utc: string | null;
  name: string | null;
};

type LlmProvidersPageClientProps = {
  initialRows: LlmProviderRow[];
  initialError: string | null;
  initialSuccess: string | null;
};

function normalizeName(value: string) {
  return value.trim();
}

function validateName(value: string) {
  if (!value) {
    return "Name is required.";
  }

  return null;
}

function formatUtc(value: string | null) {
  return formatUtcDate(value, { emptyFallback: "Unknown", preserveInvalid: true });
}

export default function LlmProvidersPageClient({ initialRows, initialError, initialSuccess }: LlmProvidersPageClientProps) {
  const [rows, setRows] = useState<LlmProviderRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [createName, setCreateName] = useState("");
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
      const name = String(row.name ?? "").toLowerCase();
      return id.includes(query) || name.includes(query);
    });
  }, [rows, search]);

  const summaryLabel = `Showing ${filteredRows.length} provider${filteredRows.length === 1 ? "" : "s"}`;

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeName(createName);
    const validationError = validateName(normalized);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    startCreateTransition(async () => {
      const result = await createLlmProviderInlineAction({ name: normalized });
      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => [result.row, ...previous]);
      setCreateName("");
      setErrorMessage(null);
      setSuccessMessage(`Created provider "${result.row.name ?? normalized}".`);
    });
  };

  const onSaveRow = (id: string) => {
    const row = rows.find((candidate) => String(candidate.id) === id);
    const currentValue = row?.name ?? "";
    const normalized = normalizeName(draftById[id] ?? String(currentValue));
    const validationError = validateName(normalized);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    startRowTransition(async () => {
      setIsSavingId(id);
      const result = await updateLlmProviderInlineAction({ id, name: normalized });
      setIsSavingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.map((candidate) => (String(candidate.id) === id ? result.row : candidate)));
      setDraftById((previous) => ({ ...previous, [id]: result.row.name ?? normalized }));
      setErrorMessage(null);
      setSuccessMessage(`Updated provider "${result.row.name ?? normalized}".`);
    });
  };

  const onDeleteRow = (id: string) => {
    if (!window.confirm("Delete this provider?")) {
      return;
    }

    startRowTransition(async () => {
      setIsDeletingId(id);
      const result = await deleteLlmProviderInlineAction({ id });
      setIsDeletingId(null);

      if (!result.ok) {
        setErrorMessage(result.error);
        setSuccessMessage(null);
        return;
      }

      setRows((previous) => previous.filter((candidate) => String(candidate.id) !== id));
      setErrorMessage(null);
      setSuccessMessage("Deleted provider.");
    });
  };

  const tableHasRows = filteredRows.length > 0;
  const emptyMessage = rows.length === 0 ? "No providers yet. Create your first provider above." : "No providers match your search.";

  return (
    <div>
      <h1 className="admin-page-title">LLM Providers</h1>
      <p className="admin-page-description">Manage LLM providers (CRUD).</p>

      {errorMessage ? <p className="admin-alert-danger mt-4">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert-success mt-4">{successMessage}</p> : null}

      <section className="admin-card mt-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <label className="block text-xs text-slate-500">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or provider name..."
              className="admin-input"
            />
          </label>

          <form onSubmit={onCreateSubmit} className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-slate-500">
              <span className="mb-1 block font-medium">New Provider Name</span>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="OpenAI"
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

      <div className="mt-4">
        <p className="admin-summary-pill">{summaryLabel}</p>
      </div>

      <section className="admin-table-wrap mt-3">
        <table className="admin-table min-w-full">
          <thead className="text-left">
            <tr>
              <th className="w-20 px-5 py-3.5">ID</th>
              <th className="w-56 px-5 py-3.5">Created At</th>
              <th className="px-5 py-3.5">Name</th>
              <th className="w-28 px-5 py-3.5">Edit</th>
              <th className="w-24 px-5 py-3.5 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {tableHasRows ? (
              filteredRows.map((row) => {
                const rowId = String(row.id);
                const rowDraft = draftById[rowId] ?? String(row.name ?? "");
                const rowBusy = isRowPending && (isSavingId === rowId || isDeletingId === rowId);

                return (
                  <tr key={rowId} className="align-middle">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{rowId}</td>
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
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onSaveRow(rowId);
                          }
                        }}
                        className="admin-input min-w-64"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => onSaveRow(rowId)}
                        disabled={rowBusy}
                        className="admin-button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingId === rowId && isRowPending ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(rowId)}
                        disabled={rowBusy}
                        className="admin-button-danger px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeletingId === rowId && isRowPending ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-6 text-sm text-slate-500" colSpan={5}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
