"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

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
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${UTC_FORMATTER.format(parsed)} UTC`;
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
      <h1 className="text-2xl font-semibold text-zinc-900">LLM Providers</h1>
      <p className="mt-1 text-sm text-zinc-600">Manage LLM providers (CRUD).</p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <label className="block text-xs text-zinc-600">
            <span className="mb-1 block font-medium">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID or provider name..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900"
            />
          </label>

          <form onSubmit={onCreateSubmit} className="flex items-end gap-2">
            <label className="block flex-1 text-xs text-zinc-600">
              <span className="mb-1 block font-medium">New Provider Name</span>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="OpenAI"
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

      <div className="mt-4 text-sm text-zinc-600">{summaryLabel}</div>

      <section className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="w-20 px-4 py-3">ID</th>
              <th className="w-56 px-4 py-3">Created At</th>
              <th className="px-4 py-3">Name</th>
              <th className="w-28 px-4 py-3">Edit</th>
              <th className="w-24 px-4 py-3 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {tableHasRows ? (
              filteredRows.map((row) => {
                const rowId = String(row.id);
                const rowDraft = draftById[rowId] ?? String(row.name ?? "");
                const rowBusy = isRowPending && (isSavingId === rowId || isDeletingId === rowId);

                return (
                  <tr key={rowId} className="border-t border-zinc-100 align-middle text-zinc-700 transition-colors hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{rowId}</td>
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
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onSaveRow(rowId);
                          }
                        }}
                        className="w-full min-w-64 rounded-md border border-zinc-300 px-2.5 py-2 text-sm font-normal text-zinc-900"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSaveRow(rowId)}
                        disabled={rowBusy}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingId === rowId && isRowPending ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(rowId)}
                        disabled={rowBusy}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeletingId === rowId && isRowPending ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
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
