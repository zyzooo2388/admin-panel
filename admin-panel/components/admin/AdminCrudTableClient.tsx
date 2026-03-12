"use client";

import { useMemo, useState, type FormEvent } from "react";

import AdminDataCell from "@/components/admin/AdminDataCell";
import type { ColumnKind } from "@/lib/admin/resourceData";
import type { AdminResourceMode } from "@/lib/admin/resources";

type Props = {
  title: string;
  description: string;
  mode: AdminResourceMode;
  resourceKey: string;
  redirectPath: string;
  rows: Record<string, unknown>[];
  displayColumns: string[];
  editableColumns: string[];
  idColumn: string | null;
  columnKinds: Record<string, ColumnKind>;
  errorMessage: string | null;
  successMessage: string | null;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  columnLabels?: Record<string, string>;
  fieldOptions?: Record<string, { value: string; label: string }[]>;
  actionsHeaderLabel?: string;
  emptyStateMessage?: string;
  requiredColumns?: string[];
  createFieldDefaults?: Record<string, unknown>;
};

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

function parseMessageQuery(initial: string | null, fallback: string | null) {
  return initial ?? fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function FieldInput({
  name,
  value,
  kind,
  required,
  options,
}: {
  name: string;
  value: unknown;
  kind: ColumnKind;
  required?: boolean;
  options?: { value: string; label: string }[];
}) {
  if (options) {
    return (
      <select
        name={name}
        defaultValue={value === null || value === undefined ? "" : String(value)}
        required={required}
        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "boolean") {
    const stringValue = value === true ? "true" : value === false ? "false" : "";
    return (
      <select
        name={name}
        defaultValue={stringValue}
        required={required}
        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
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
        rows={3}
        className={`w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs ${kind === "json" ? "font-mono" : ""}`}
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
      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs"
    />
  );
}

export default function AdminCrudTableClient({
  title,
  description,
  mode,
  resourceKey,
  redirectPath,
  rows,
  displayColumns,
  editableColumns,
  idColumn,
  columnKinds,
  errorMessage,
  successMessage,
  createAction,
  updateAction,
  deleteAction,
  columnLabels,
  fieldOptions,
  actionsHeaderLabel,
  emptyStateMessage,
  requiredColumns = [],
  createFieldDefaults,
}: Props) {
  const [search, setSearch] = useState("");
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string | null>>({});

  const searchableColumns = useMemo(
    () => [...new Set([...displayColumns, ...editableColumns].filter((column) => column !== idColumn))],
    [displayColumns, editableColumns, idColumn],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      searchableColumns.some((column) => {
        const value = row[column];
        if (value === null || value === undefined) {
          return false;
        }

        const normalized = typeof value === "string" ? value : JSON.stringify(value);
        return normalized.toLowerCase().includes(query);
      }),
    );
  }, [rows, searchableColumns, search]);

  const canCreate = mode === "crud" && editableColumns.length > 0;
  const canDelete = mode === "crud";
  const canUpdate = editableColumns.length > 0;
  const fieldsJson = JSON.stringify(editableColumns);
  const kindsJson = JSON.stringify(columnKinds);
  const requiredColumnsJson = JSON.stringify(requiredColumns);
  const requiredColumnSet = new Set(requiredColumns);
  const resolveColumnLabel = (column: string) => columnLabels?.[column] ?? column;
  const updateHeaderLabel = canUpdate && !canDelete ? (actionsHeaderLabel ?? "Edit") : "Edit";
  const resolvedEmptyStateMessage = emptyStateMessage ?? "No rows found.";

  function validateForm(form: HTMLFormElement, options?: { isCreate?: boolean }) {
    for (const column of requiredColumns) {
      const field = form.elements.namedItem(`field:${column}`);

      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }

      if (field.value.trim().length === 0) {
        return `${resolveColumnLabel(column)} is required.`;
      }
    }

    if (resourceKey === "caption-examples") {
      const priorityField = form.elements.namedItem("field:priority");
      if (
        priorityField instanceof HTMLInputElement ||
        priorityField instanceof HTMLTextAreaElement ||
        priorityField instanceof HTMLSelectElement
      ) {
        const raw = priorityField.value.trim();
        if (raw.length > 0) {
          const parsed = Number(raw);
          if (!Number.isInteger(parsed)) {
            return `${resolveColumnLabel("priority")} must be a valid integer.`;
          }
        } else if (!options?.isCreate) {
          return `${resolveColumnLabel("priority")} must be a valid integer.`;
        }
      }

      const imageIdField = form.elements.namedItem("field:image_id");
      if (
        imageIdField instanceof HTMLInputElement ||
        imageIdField instanceof HTMLTextAreaElement ||
        imageIdField instanceof HTMLSelectElement
      ) {
        const raw = imageIdField.value.trim();
        imageIdField.value = raw;

        if (raw.length > 0 && !isUuid(raw)) {
          return `${resolveColumnLabel("image_id")} must be a valid UUID or left blank.`;
        }
      }
    }

    return null;
  }

  function trimFormFields(form: HTMLFormElement) {
    for (const column of editableColumns) {
      const field = form.elements.namedItem(`field:${column}`);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = field.value.trim();
      }
    }
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    trimFormFields(event.currentTarget);
    const error = validateForm(event.currentTarget, { isCreate: true });
    setCreateValidationError(error);

    if (error) {
      event.preventDefault();
    }
  }

  function handleEditSubmit(rowId: string, event: FormEvent<HTMLFormElement>) {
    trimFormFields(event.currentTarget);
    const error = validateForm(event.currentTarget);
    setEditValidationErrors((current) => ({ ...current, [rowId]: error }));

    if (error) {
      event.preventDefault();
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>

      {parseMessageQuery(errorMessage, null) ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}
      {parseMessageQuery(successMessage, null) ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      <div className="mt-4 w-full max-w-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search rows..."
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {canCreate ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">Create record</h2>
          <form action={createAction} onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
            <input type="hidden" name="resource_key" value={resourceKey} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input type="hidden" name="editable_columns" value={fieldsJson} />
            <input type="hidden" name="field_kinds" value={kindsJson} />
            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

            {createValidationError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createValidationError}</p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {editableColumns.map((column) => (
                <label key={`create-${column}`} className="block text-xs text-zinc-600">
                  <span className="mb-1 block font-medium">
                    {resolveColumnLabel(column)}
                    {requiredColumnSet.has(column) ? " *" : ""}
                  </span>
                  <FieldInput
                    name={`field:${column}`}
                    value={createFieldDefaults?.[column] ?? null}
                    kind={columnKinds[column] ?? "string"}
                    required={requiredColumnSet.has(column)}
                    options={fieldOptions?.[column]}
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Create
            </button>
          </form>
        </section>
      ) : null}

      {editableColumns.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          TODO: No editable columns could be detected from current table access. Add columns to resource config if needed.
        </p>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              {displayColumns.map((column) => (
                <th key={`head-${column}`} className="px-4 py-3">
                  {resolveColumnLabel(column)}
                </th>
              ))}
              {canUpdate ? <th className="px-4 py-3">{updateHeaderLabel}</th> : null}
              {canDelete ? <th className="px-4 py-3">Delete</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const idValue = idColumn ? row[idColumn] : row.id;
                const rowId = idValue === null || idValue === undefined ? "" : String(idValue);
                const key = rowId || `row-${index}`;

                return (
                  <tr key={key} className="border-t border-zinc-100 align-top text-zinc-700">
                    {displayColumns.map((column) => (
                      <td key={`${key}-${column}`} className="px-4 py-3">
                        <AdminDataCell value={row[column]} />
                      </td>
                    ))}

                    {canUpdate ? (
                      <td className="px-4 py-3">
                        {rowId ? (
                          <form action={updateAction} onSubmit={(event) => handleEditSubmit(rowId, event)} className="space-y-2">
                            <input type="hidden" name="resource_key" value={resourceKey} />
                            <input type="hidden" name="redirect_path" value={redirectPath} />
                            <input type="hidden" name="row_id" value={rowId} />
                            <input type="hidden" name="id_column" value={idColumn ?? "id"} />
                            <input type="hidden" name="editable_columns" value={fieldsJson} />
                            <input type="hidden" name="field_kinds" value={kindsJson} />
                            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

                            {editValidationErrors[rowId] ? (
                              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {editValidationErrors[rowId]}
                              </p>
                            ) : null}

                            {editableColumns.map((column) => (
                              <label key={`${key}-edit-${column}`} className="block text-xs text-zinc-600">
                                <span className="mb-1 block font-medium">
                                  {resolveColumnLabel(column)}
                                  {requiredColumnSet.has(column) ? " *" : ""}
                                </span>
                                <FieldInput
                                  name={`field:${column}`}
                                  value={row[column]}
                                  kind={columnKinds[column] ?? "string"}
                                  required={requiredColumnSet.has(column)}
                                  options={fieldOptions?.[column]}
                                />
                              </label>
                            ))}

                            <button
                              type="submit"
                              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-400">Missing ID</span>
                        )}
                      </td>
                    ) : null}

                    {canDelete ? (
                      <td className="px-4 py-3">
                        {rowId ? (
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
                            <button
                              type="submit"
                              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-400">Missing ID</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={displayColumns.length + (canUpdate ? 1 : 0) + (canDelete ? 1 : 0)}>
                  {resolvedEmptyStateMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
