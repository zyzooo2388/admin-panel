"use client";

import { Fragment, useMemo, useRef, useState, type FormEvent } from "react";

import type { ColumnKind } from "@/lib/admin/resourceData";
import type { AdminResourceMode } from "@/lib/admin/resources";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  title: string;
  description: string;
  mode: AdminResourceMode;
  resourceKey: string;
  redirectPath: string;
  rows: Record<string, unknown>[];
  editableColumns: string[];
  idColumn: string | null;
  columnKinds: Record<string, ColumnKind>;
  errorMessage: string | null;
  successMessage: string | null;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  requiredColumns?: string[];
  termTypeLabels?: Record<string, string>;
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

function dedupeColumns(columns: string[]) {
  return [...new Set(columns.filter(Boolean))];
}

function toInputValue(value: unknown, kind: ColumnKind) {
  if (value === null || value === undefined) {
    return "";
  }

  if (kind === "json") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatPreview(value: unknown, maxLength: number) {
  const normalized = stringifyValue(value).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "-";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function formatUtc(value: unknown) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    return "Never updated";
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return `${UTC_FORMATTER.format(parsed)} UTC`;
}

function toPriorityValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function priorityBadgeClass(priority: number | null) {
  if (priority === null) {
    return "border-zinc-200 bg-zinc-100 text-zinc-600";
  }

  if (priority >= 8) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (priority >= 5) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function compareByCreatedDatetimeDesc(a: Record<string, unknown>, b: Record<string, unknown>) {
  const at = new Date(String(a.created_datetime_utc ?? "")).getTime();
  const bt = new Date(String(b.created_datetime_utc ?? "")).getTime();

  if (!Number.isNaN(at) && !Number.isNaN(bt)) {
    return bt - at;
  }

  if (!Number.isNaN(bt)) {
    return 1;
  }

  if (!Number.isNaN(at)) {
    return -1;
  }

  return 0;
}

function sortTermsByCreatedDatetimeDesc(rows: Record<string, unknown>[]) {
  return [...rows].sort(compareByCreatedDatetimeDesc);
}

function hasDisplayFields(row: Record<string, unknown>) {
  return ["term", "definition", "example"].every((field) => field in row);
}

function isTextareaField(name: string, kind: ColumnKind) {
  if (kind === "json") {
    return true;
  }

  const normalizedName = name.replace(/^field:/, "");
  return ["definition", "description", "image_description", "example", "text", "content", "body", "prompt", "instruction", "notes"].includes(
    normalizedName,
  );
}

function humanizeColumnLabel(column: string) {
  return column
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function FieldInput({
  name,
  value,
  kind,
  required,
  rows,
}: {
  name: string;
  value: unknown;
  kind: ColumnKind;
  required?: boolean;
  rows?: number;
}) {
  if (kind === "boolean") {
    const stringValue = value === true ? "true" : value === false ? "false" : "";
    return (
      <select
        name={name}
        defaultValue={stringValue}
        required={required}
        className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs"
      >
        <option value="">null</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (isTextareaField(name, kind)) {
    return (
      <textarea
        name={name}
        defaultValue={toInputValue(value, kind)}
        required={required}
        rows={rows ?? 3}
        className={`w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs ${kind === "json" ? "font-mono" : ""}`}
      />
    );
  }

  return (
    <input
      name={name}
      defaultValue={toInputValue(value, kind)}
      type={kind === "number" ? "number" : "text"}
      step={kind === "number" ? "any" : undefined}
      required={required}
      className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs"
    />
  );
}

export default function TermsCrudTableClient({
  title,
  description,
  mode,
  resourceKey,
  redirectPath,
  rows,
  editableColumns,
  idColumn,
  columnKinds,
  errorMessage,
  successMessage,
  updateAction,
  deleteAction,
  requiredColumns = [],
  termTypeLabels,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const createFormRef = useRef<HTMLFormElement>(null);
  const actorProfileIdRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>(() => sortTermsByCreatedDatetimeDesc(rows));
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string | null>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(errorMessage);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(successMessage);

  const requiredColumnSet = new Set(requiredColumns);
  const canCreate = mode === "crud" && editableColumns.length > 0;
  const canDelete = mode === "crud";
  const canUpdate = editableColumns.length > 0;

  const createColumns = useMemo(() => {
    const baseColumns = ["term", "definition", "example"].filter((column) => editableColumns.includes(column));
    const requiredExtras = requiredColumns.filter((column) => editableColumns.includes(column));
    return dedupeColumns([...baseColumns, ...requiredExtras]);
  }, [editableColumns, requiredColumns]);

  const fieldsJson = JSON.stringify(editableColumns);
  const createFieldsJson = JSON.stringify(createColumns);
  const kindsJson = JSON.stringify(columnKinds);
  const requiredColumnsJson = JSON.stringify(requiredColumns);
  const totalRowsCount = tableRows.length;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tableRows;
    }

    return tableRows.filter((row) => {
      const searchableValues = [row.term, row.definition, row.example, row[idColumn ?? "id"] ?? row.id]
        .map((value) => stringifyValue(value).toLowerCase())
        .join(" ");

      return searchableValues.includes(query);
    });
  }, [idColumn, search, tableRows]);

  function resolveTypeLabel(value: unknown) {
    if (value === null || value === undefined || String(value).trim().length === 0) {
      return "-";
    }

    const key = String(value);
    return termTypeLabels?.[key] ?? `Type #${key}`;
  }

  function trimFormFields(form: HTMLFormElement, columns: string[]) {
    for (const column of columns) {
      const field = form.elements.namedItem(`field:${column}`);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = field.value.trim();
      }
    }
  }

  function validateRequired(form: HTMLFormElement) {
    for (const column of requiredColumns) {
      const field = form.elements.namedItem(`field:${column}`);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }

      if (field.value.trim().length === 0) {
        return `${column} is required.`;
      }
    }

    return null;
  }

  async function getActorProfileId() {
    if (actorProfileIdRef.current) {
      return actorProfileIdRef.current;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) {
      return null;
    }

    actorProfileIdRef.current = user.id;
    return user.id;
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreating) {
      return;
    }

    const form = event.currentTarget;
    trimFormFields(form, createColumns);
    const error = validateRequired(form);
    setCreateValidationError(error);

    if (error) {
      setGlobalError(`Failed to create ${title}: ${error}`);
      setGlobalSuccess(null);
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const column of createColumns) {
      const field = form.elements.namedItem(`field:${column}`);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }

      const rawValue = field.value.trim();
      const kind = columnKinds[column] ?? "string";

      if (rawValue.length === 0) {
        payload[column] = null;
        continue;
      }

      if (kind === "number") {
        const parsedNumber = Number(rawValue);
        if (Number.isNaN(parsedNumber)) {
          const message = `${column}: Invalid number: ${rawValue}`;
          setCreateValidationError(message);
          setGlobalError(`Failed to create ${title}: ${message}`);
          setGlobalSuccess(null);
          return;
        }

        payload[column] = parsedNumber;
        continue;
      }

      if (kind === "boolean") {
        if (rawValue !== "true" && rawValue !== "false") {
          const message = `${column}: Invalid boolean: ${rawValue}`;
          setCreateValidationError(message);
          setGlobalError(`Failed to create ${title}: ${message}`);
          setGlobalSuccess(null);
          return;
        }

        payload[column] = rawValue === "true";
        continue;
      }

      if (kind === "json") {
        try {
          payload[column] = JSON.parse(rawValue);
        } catch {
          const message = `${column}: Invalid JSON value.`;
          setCreateValidationError(message);
          setGlobalError(`Failed to create ${title}: ${message}`);
          setGlobalSuccess(null);
          return;
        }
        continue;
      }

      payload[column] = rawValue;
    }

    setIsCreating(true);
    setGlobalError(null);
    setGlobalSuccess(null);

    void (async () => {
      try {
        const actorProfileId = await getActorProfileId();
        if (!actorProfileId) {
          setGlobalError(`Failed to create ${title}: unable to resolve current user.`);
          return;
        }

        const payloadWithAudit = {
          ...payload,
          created_by_user_id: actorProfileId,
          modified_by_user_id: actorProfileId,
        };
        const { data, error: insertError } = await supabase.from("terms").insert(payloadWithAudit).select("*").single();

        if (insertError) {
          setGlobalError(`Failed to create ${title}: ${insertError.message}`);
          return;
        }

        const insertedRow = data && typeof data === "object" ? (data as Record<string, unknown>) : null;

        if (insertedRow && hasDisplayFields(insertedRow)) {
          setTableRows((current) => [insertedRow, ...current.filter((row) => row[idColumn ?? "id"] !== insertedRow[idColumn ?? "id"])]);
        } else {
          const { data: refreshedRows, error: refreshError } = await supabase
            .from("terms")
            .select("*")
            .order("created_datetime_utc", { ascending: false });

          if (refreshError) {
            setGlobalError(`Term created, but refresh failed: ${refreshError.message}`);
            return;
          }

          setTableRows(sortTermsByCreatedDatetimeDesc((refreshedRows as Record<string, unknown>[] | null) ?? []));
        }

        createFormRef.current?.reset();
        setCreateValidationError(null);
        setGlobalSuccess(`${title} record created.`);
      } catch (createError) {
        const message = createError instanceof Error ? createError.message : "Unknown error";
        setGlobalError(`Failed to create ${title}: ${message}`);
      } finally {
        setIsCreating(false);
      }
    })();
  }

  function handleEditSubmit(rowId: string, event: FormEvent<HTMLFormElement>) {
    trimFormFields(event.currentTarget, editableColumns);
    const error = validateRequired(event.currentTarget);
    setEditValidationErrors((current) => ({ ...current, [rowId]: error }));

    if (error) {
      event.preventDefault();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>

      {globalError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{globalError}</p> : null}
      {globalSuccess ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{globalSuccess}</p>
      ) : null}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="block text-xs text-zinc-600">
          <span className="mb-2 block font-medium text-zinc-800">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search term, definition, example, or ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </section>

      {canCreate ? (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form ref={createFormRef} onSubmit={handleCreateSubmit} className="space-y-4">
            <input type="hidden" name="resource_key" value={resourceKey} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input type="hidden" name="editable_columns" value={createFieldsJson} />
            <input type="hidden" name="field_kinds" value={kindsJson} />
            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-900">Create term</h2>
              <p className="text-xs text-zinc-500">Add a new term entry. New records appear at the top of the table immediately after create.</p>
            </div>

            {createValidationError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{createValidationError}</p>
            ) : null}

            <div className="grid gap-4">
              {createColumns
                .filter((column) => column === "term")
                .map((column) => (
                  <label key={`create-${column}`} className="block text-xs text-zinc-600">
                    <span className="mb-1.5 block font-medium text-zinc-800">
                      {humanizeColumnLabel(column)}
                      {requiredColumnSet.has(column) ? " *" : ""}
                    </span>
                    <FieldInput name={`field:${column}`} value={null} kind={columnKinds[column] ?? "string"} required={requiredColumnSet.has(column)} rows={2} />
                  </label>
                ))}

              <div className="grid gap-4 lg:grid-cols-2">
                {createColumns
                  .filter((column) => column !== "term")
                  .map((column) => (
                    <label key={`create-${column}`} className="block text-xs text-zinc-600">
                      <span className="mb-1.5 block font-medium text-zinc-800">
                        {humanizeColumnLabel(column)}
                        {requiredColumnSet.has(column) ? " *" : ""}
                      </span>
                      <FieldInput
                        name={`field:${column}`}
                        value={null}
                        kind={columnKinds[column] ?? "string"}
                        required={requiredColumnSet.has(column)}
                        rows={column === "definition" || column === "example" ? 4 : 2}
                      />
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex min-w-24 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
        Showing {filteredRows.length} of {totalRowsCount} term{totalRowsCount === 1 ? "" : "s"}
      </div>

      <section className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="w-[16rem] px-4 py-3">Term</th>
              <th className="w-[24rem] px-4 py-3">Definition</th>
              <th className="w-[20rem] px-4 py-3">Example</th>
              <th className="w-24 px-4 py-3">Priority</th>
              <th className="w-28 px-4 py-3">Type</th>
              <th className="w-52 px-4 py-3">Updated</th>
              <th className="w-20 px-4 py-3">ID</th>
              <th className="w-40 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const idValue = idColumn ? row[idColumn] : row.id;
                const rowId = idValue === null || idValue === undefined ? "" : String(idValue);
                const key = rowId || `row-${index}`;
                const priority = toPriorityValue(row.priority);
                const rowIsEditing = rowId.length > 0 && editingRowId === rowId;

                return (
                  <Fragment key={key}>
                    <tr className="border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50">
                      <td className="px-4 py-4">
                        <p className="max-w-[15rem] break-words text-base font-semibold leading-5 text-zinc-900" title={stringifyValue(row.term) || "-"}>
                          {stringifyValue(row.term) || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[23rem] whitespace-normal break-words leading-5 text-zinc-700" title={stringifyValue(row.definition) || ""}>
                          {formatPreview(row.definition, 320)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[19rem] whitespace-normal break-words leading-5 text-zinc-700" title={stringifyValue(row.example) || ""}>
                          {formatPreview(row.example, 220)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${priorityBadgeClass(priority)}`}>
                          {priority === null ? "-" : priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-700">
                        <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1">{resolveTypeLabel(row.term_type_id)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-zinc-600">{formatUtc(row.modified_datetime_utc)}</td>
                      <td className="px-4 py-4 font-mono text-xs text-zinc-400">{rowId || "-"}</td>
                      <td className="px-4 py-4">
                        {rowId ? (
                          <div className="flex items-center gap-2">
                            {canUpdate ? (
                              <button
                                type="button"
                                onClick={() => setEditingRowId((current) => (current === rowId ? null : rowId))}
                                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                              >
                                {rowIsEditing ? "Close" : "Edit"}
                              </button>
                            ) : null}
                            {canDelete ? (
                              <form
                                action={deleteAction}
                                onSubmit={(event) => {
                                  if (!window.confirm("Delete this record?")) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                <input type="hidden" name="resource_key" value={resourceKey} />
                                <input type="hidden" name="redirect_path" value={redirectPath} />
                                <input type="hidden" name="row_id" value={rowId} />
                                <input type="hidden" name="id_column" value={idColumn ?? "id"} />
                                <button type="submit" className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                                  Delete
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">Missing ID</span>
                        )}
                      </td>
                    </tr>

                    {rowIsEditing && canUpdate ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/70">
                        <td colSpan={8} className="px-4 py-4">
                          <form action={updateAction} onSubmit={(event) => handleEditSubmit(rowId, event)} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                            <input type="hidden" name="resource_key" value={resourceKey} />
                            <input type="hidden" name="redirect_path" value={redirectPath} />
                            <input type="hidden" name="row_id" value={rowId} />
                            <input type="hidden" name="id_column" value={idColumn ?? "id"} />
                            <input type="hidden" name="editable_columns" value={fieldsJson} />
                            <input type="hidden" name="field_kinds" value={kindsJson} />
                            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

                            {editValidationErrors[rowId] ? (
                              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{editValidationErrors[rowId]}</p>
                            ) : null}

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {editableColumns.map((column) => (
                                <label key={`${key}-edit-${column}`} className="block text-xs text-zinc-600">
                                  <span className="mb-1 block font-medium">
                                    {humanizeColumnLabel(column)}
                                    {requiredColumnSet.has(column) ? " *" : ""}
                                  </span>
                                  <FieldInput
                                    name={`field:${column}`}
                                    value={row[column]}
                                    kind={columnKinds[column] ?? "string"}
                                    required={requiredColumnSet.has(column)}
                                    rows={column === "definition" || column === "example" ? 3 : 2}
                                  />
                                </label>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100">
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRowId(null)}
                                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-sm text-zinc-500">
                  No terms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
