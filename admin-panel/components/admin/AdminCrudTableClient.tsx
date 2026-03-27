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
        className="admin-input text-xs"
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
        className="admin-input text-xs"
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
        className={`admin-input text-xs ${kind === "json" ? "font-mono" : ""}`}
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
      className="admin-input text-xs"
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
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-description">{description}</p>

      {parseMessageQuery(errorMessage, null) ? (
        <p className="admin-alert-danger mt-4">{errorMessage}</p>
      ) : null}
      {parseMessageQuery(successMessage, null) ? (
        <p className="admin-alert-success mt-4">{successMessage}</p>
      ) : null}

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-summary-pill">
          Showing {filteredRows.length} of {rows.length} rows
        </div>
        <div className="w-full max-w-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rows..."
            className="admin-input"
          />
        </div>
      </section>

      {canCreate ? (
        <section className="admin-card mt-6 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Create record</h2>
          <form action={createAction} onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
            <input type="hidden" name="resource_key" value={resourceKey} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input type="hidden" name="editable_columns" value={fieldsJson} />
            <input type="hidden" name="field_kinds" value={kindsJson} />
            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

            {createValidationError ? (
              <p className="admin-alert-danger">{createValidationError}</p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {editableColumns.map((column) => (
                <label key={`create-${column}`} className="block text-xs text-slate-500">
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
              className="admin-button-primary inline-flex px-4 py-2 text-sm"
            >
              Create
            </button>
          </form>
        </section>
      ) : null}

      {editableColumns.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-3.5 text-sm text-amber-800 shadow-[0_12px_24px_rgba(245,158,11,0.08)]">
          TODO: No editable columns could be detected from current table access. Add columns to resource config if needed.
        </p>
      ) : null}

      <section className="admin-table-wrap mt-6">
        <table className="admin-table">
          <thead>
            <tr>
              {displayColumns.map((column) => (
                <th key={`head-${column}`}>
                  {resolveColumnLabel(column)}
                </th>
              ))}
              {canUpdate ? <th>{updateHeaderLabel}</th> : null}
              {canDelete ? <th>Delete</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const idValue = idColumn ? row[idColumn] : row.id;
                const rowId = idValue === null || idValue === undefined ? "" : String(idValue);
                const key = rowId || `row-${index}`;

                return (
                  <tr key={key}>
                    {displayColumns.map((column) => (
                      <td key={`${key}-${column}`}>
                        <AdminDataCell value={row[column]} />
                      </td>
                    ))}

                    {canUpdate ? (
                      <td>
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
                              <p className="admin-alert-danger">
                                {editValidationErrors[rowId]}
                              </p>
                            ) : null}

                            {editableColumns.map((column) => (
                              <label key={`${key}-edit-${column}`} className="block text-xs text-slate-500">
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
                              className="admin-button-secondary px-3 py-1.5 text-xs"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">Missing ID</span>
                        )}
                      </td>
                    ) : null}

                    {canDelete ? (
                      <td>
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
                              className="admin-button-danger px-3 py-1.5 text-xs"
                            >
                              Delete
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">Missing ID</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="text-slate-500" colSpan={displayColumns.length + (canUpdate ? 1 : 0) + (canDelete ? 1 : 0)}>
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
