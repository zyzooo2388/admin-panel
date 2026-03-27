"use client";

import { Fragment, useMemo, useState, type CSSProperties, type FormEvent } from "react";

import type { ColumnKind } from "@/lib/admin/resourceData";
import type { AdminResourceMode } from "@/lib/admin/resources";
import { formatUtcDate } from "@/lib/dates/formatUtcDate";

type CaptionExampleRow = {
  id: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  image_description: string | null;
  caption: string | null;
  explanation: string | null;
  priority: number | null;
  image_id: string | null;
  [key: string]: unknown;
};

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
  requiredColumns?: string[];
  createFieldDefaults?: Record<string, unknown>;
};

const REQUIRED_LAYOUT_FIELDS = ["caption", "image_description", "explanation", "priority", "image_id"] as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolvePriority(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatUtc(value: string | null): string {
  return formatUtcDate(value, { includeSeconds: false });
}

function formatUpdatedUtc(value: string | null): string {
  if (!value) {
    return "Never updated";
  }

  return formatUtc(value);
}

function shortUuid(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const str = String(value).trim();
  if (!str) {
    return "—";
  }

  if (str.length <= 14) {
    return str;
  }

  return `${str.slice(0, 8)}...${str.slice(-6)}`;
}

const REQUIRED_LAYOUT_FIELD_SET = new Set<string>(REQUIRED_LAYOUT_FIELDS);

function lineClampStyle(lines: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function getRowId(row: Record<string, unknown>, idColumn: string | null): string {
  const raw = idColumn ? row[idColumn] : row.id;
  return raw === null || raw === undefined ? "" : String(raw);
}

function asCaptionRow(row: Record<string, unknown>): CaptionExampleRow {
  return {
    id: typeof row.id === "string" ? row.id : row.id === null ? null : row.id === undefined ? null : String(row.id),
    created_datetime_utc:
      typeof row.created_datetime_utc === "string" ? row.created_datetime_utc : row.created_datetime_utc ? String(row.created_datetime_utc) : null,
    modified_datetime_utc:
      typeof row.modified_datetime_utc === "string" ? row.modified_datetime_utc : row.modified_datetime_utc ? String(row.modified_datetime_utc) : null,
    image_description:
      typeof row.image_description === "string" ? row.image_description : row.image_description ? String(row.image_description) : null,
    caption: typeof row.caption === "string" ? row.caption : row.caption ? String(row.caption) : null,
    explanation: typeof row.explanation === "string" ? row.explanation : row.explanation ? String(row.explanation) : null,
    priority: resolvePriority(row.priority),
    image_id: typeof row.image_id === "string" ? row.image_id : row.image_id ? String(row.image_id) : null,
    ...row,
  };
}

function toFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-slate-700">
      {label}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  );
}

export default function CaptionExamplesTableClient({
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
  requiredColumns = [],
  createFieldDefaults,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string | null>>({});

  const canCreate = mode === "crud" && editableColumns.length > 0;
  const canDelete = mode === "crud";
  const canUpdate = editableColumns.length > 0;

  const editableColumnSet = useMemo(() => new Set(editableColumns), [editableColumns]);
  const requiredColumnSet = useMemo(() => new Set(requiredColumns), [requiredColumns]);
  const orderedEditColumns = useMemo<string[]>(
    () => [
      ...REQUIRED_LAYOUT_FIELDS.filter((field) => editableColumnSet.has(field)),
      ...editableColumns.filter((column) => !REQUIRED_LAYOUT_FIELD_SET.has(column)),
    ],
    [editableColumnSet, editableColumns],
  );

  const fieldsJson = JSON.stringify(editableColumns);
  const kindsJson = JSON.stringify(columnKinds);
  const requiredColumnsJson = JSON.stringify(requiredColumns);

  const typedRows = useMemo(
    () => rows.map((row) => asCaptionRow(row)).sort((a, b) => new Date(b.created_datetime_utc ?? "").getTime() - new Date(a.created_datetime_utc ?? "").getTime()),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return typedRows;
    }

    return typedRows.filter((row) => {
      const candidates = [row.caption, row.image_description, row.explanation, row.id, row.image_id];
      return candidates.some((value) => (value ?? "").toLowerCase().includes(search));
    });
  }, [query, typedRows]);

  const summary = useMemo(() => {
    const visible = filteredRows.length.toLocaleString();
    const total = typedRows.length.toLocaleString();

    if (query.trim()) {
      return `Showing ${visible} of ${total} caption examples`;
    }

    return `Showing ${visible} caption examples`;
  }, [filteredRows.length, query, typedRows.length]);

  function validateForm(form: HTMLFormElement, options?: { isCreate?: boolean }) {
    for (const column of requiredColumns) {
      const field = form.elements.namedItem(`field:${column}`);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }

      if (field.value.trim().length === 0) {
        return `${column.replace(/_/g, " ")} is required.`;
      }
    }

    const priorityField = form.elements.namedItem("field:priority");
    if (priorityField instanceof HTMLInputElement || priorityField instanceof HTMLTextAreaElement || priorityField instanceof HTMLSelectElement) {
      const raw = priorityField.value.trim();
      if (raw.length > 0) {
        const parsed = Number(raw);
        if (!Number.isInteger(parsed)) {
          return "priority must be a valid integer.";
        }
      } else if (!options?.isCreate) {
        return "priority must be a valid integer.";
      }
    }

    const imageIdField = form.elements.namedItem("field:image_id");
    if (imageIdField instanceof HTMLInputElement || imageIdField instanceof HTMLTextAreaElement || imageIdField instanceof HTMLSelectElement) {
      const raw = imageIdField.value.trim();
      imageIdField.value = raw;
      if (raw.length > 0 && !isUuid(raw)) {
        return "image_id must be a valid UUID or left blank.";
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
    const validationError = validateForm(event.currentTarget, { isCreate: true });
    setCreateValidationError(validationError);

    if (validationError) {
      event.preventDefault();
    }
  }

  function handleEditSubmit(rowId: string, event: FormEvent<HTMLFormElement>) {
    trimFormFields(event.currentTarget);
    const validationError = validateForm(event.currentTarget);
    setEditValidationErrors((current) => ({ ...current, [rowId]: validationError }));

    if (validationError) {
      event.preventDefault();
    }
  }

  function rowKey(row: CaptionExampleRow, index: number) {
    return row.id ?? `row-${index}`;
  }

  function toggleExpanded(key: string) {
    setExpandedRowKey((current) => (current === key ? null : key));
  }

  function formatLabel(field: string): string {
    return field
      .split("_")
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(" ");
  }

  return (
    <div>
      <h1 className="admin-page-title">{title}</h1>
      <p className="admin-page-description">{description}</p>

      {errorMessage ? <p className="admin-alert-danger mt-4">{errorMessage}</p> : null}
      {successMessage ? <p className="admin-alert-success mt-4">{successMessage}</p> : null}

      <section className="admin-toolbar-card mt-5 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Search</h2>
            <p className="mt-1 text-xs text-slate-500">Search by caption, image description, explanation, ID, or image ID.</p>
          </div>
          <div className="w-full max-w-md">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search caption examples..."
              className="admin-input"
            />
          </div>
        </div>
      </section>

      {canCreate ? (
        <section className="admin-card mt-5 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Create caption example</h2>
          <form action={createAction} onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <input type="hidden" name="resource_key" value={resourceKey} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input type="hidden" name="editable_columns" value={fieldsJson} />
            <input type="hidden" name="field_kinds" value={kindsJson} />
            <input type="hidden" name="required_columns" value={requiredColumnsJson} />

            {createValidationError ? (
              <p className="admin-alert-danger text-sm">{createValidationError}</p>
            ) : null}

            {editableColumnSet.has("caption") ? (
              <label className="block">
                <FieldLabel label="Caption" required={requiredColumnSet.has("caption")} />
                <textarea
                  name="field:caption"
                  defaultValue={toFieldValue(createFieldDefaults?.caption)}
                  required={requiredColumnSet.has("caption")}
                  rows={2}
                  className="admin-input"
                />
              </label>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {editableColumnSet.has("image_description") ? (
                <label className="block">
                  <FieldLabel label="Image Description" required={requiredColumnSet.has("image_description")} />
                  <textarea
                    name="field:image_description"
                    defaultValue={toFieldValue(createFieldDefaults?.image_description)}
                    required={requiredColumnSet.has("image_description")}
                    rows={3}
                    className="admin-input"
                  />
                </label>
              ) : null}

              {editableColumnSet.has("explanation") ? (
                <label className="block">
                  <FieldLabel label="Explanation" required={requiredColumnSet.has("explanation")} />
                  <textarea
                    name="field:explanation"
                    defaultValue={toFieldValue(createFieldDefaults?.explanation)}
                    required={requiredColumnSet.has("explanation")}
                    rows={3}
                    className="admin-input"
                  />
                </label>
              ) : null}
            </div>

            <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
              {editableColumnSet.has("priority") ? (
                <label className="block">
                  <FieldLabel label="Priority" required={requiredColumnSet.has("priority")} />
                  <input
                    name="field:priority"
                    type="number"
                    step={1}
                    defaultValue={toFieldValue(createFieldDefaults?.priority)}
                    required={requiredColumnSet.has("priority")}
                    className="admin-input"
                  />
                </label>
              ) : null}

              {editableColumnSet.has("image_id") ? (
                <label className="block">
                  <FieldLabel label="Image ID" required={requiredColumnSet.has("image_id")} />
                  <input
                    name="field:image_id"
                    type="text"
                    defaultValue={toFieldValue(createFieldDefaults?.image_id)}
                    required={requiredColumnSet.has("image_id")}
                    className="admin-input font-mono"
                  />
                </label>
              ) : null}
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" className="admin-button-primary inline-flex px-4 py-2 text-sm">
                Create
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {editableColumns.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-3.5 text-sm text-amber-800 shadow-[0_12px_24px_rgba(245,158,11,0.08)]">
          TODO: No editable columns could be detected from current table access. Add columns to resource config if needed.
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <p className="admin-summary-pill">{summary}</p>
      </div>

      <section className="admin-table-wrap mt-3">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[18%]" />
            <col className="w-20" />
            <col className="w-32" />
            <col className="w-44" />
            <col className="w-44" />
            <col className="w-32" />
            <col className="w-32" />
          </colgroup>
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">Caption</th>
              <th className="px-5 py-3.5">Image Description</th>
              <th className="px-5 py-3.5">Explanation</th>
              <th className="px-5 py-3.5">Priority</th>
              <th className="px-5 py-3.5">Image ID</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Updated</th>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const key = rowKey(row, index);
                const rowId = getRowId(row, idColumn);
                const isExpanded = expandedRowKey === key;
                const priority = row.priority;

                return (
                  <Fragment key={key}>
                    <tr className="border-t border-slate-100 align-top text-slate-700 transition-all duration-150 hover:bg-slate-50/90">
                      <td className="px-5 py-4.5">
                        <p className={row.caption ? "leading-6 text-slate-900" : "leading-6 text-slate-400"} style={lineClampStyle(2)} title={row.caption ?? "None"}>
                          {row.caption?.trim() || "None"}
                        </p>
                      </td>
                      <td className="px-5 py-4.5">
                        <p
                          className={row.image_description ? "leading-6 text-slate-700" : "leading-6 text-slate-400"}
                          style={lineClampStyle(2)}
                          title={row.image_description ?? "None"}
                        >
                          {row.image_description?.trim() || "None"}
                        </p>
                      </td>
                      <td className="px-5 py-4.5">
                        <p className={row.explanation ? "leading-6 text-slate-700" : "leading-6 text-slate-400"} style={lineClampStyle(2)} title={row.explanation ?? "None"}>
                          {row.explanation?.trim() || "None"}
                        </p>
                      </td>
                      <td className="px-5 py-4.5">
                        {priority !== null ? (
                          <span
                            className={`admin-badge text-xs font-semibold ${
                              priority >= 8
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : priority >= 4
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {priority}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5" title={row.image_id ?? "—"}>
                        <span className={`font-mono text-xs ${row.image_id === null || row.image_id === undefined ? "text-slate-400" : "text-slate-500"}`}>
                          {shortUuid(row.image_id)}
                        </span>
                      </td>
                      <td className="px-5 py-4.5 text-xs text-slate-500">{formatUtc(row.created_datetime_utc)}</td>
                      <td className="px-5 py-4.5 text-xs text-slate-500">{formatUpdatedUtc(row.modified_datetime_utc)}</td>
                      <td className="px-5 py-4.5 font-mono text-xs text-slate-400" title={row.id ?? "None"}>
                        {shortUuid(row.id)}
                      </td>
                      <td className="px-5 py-4.5">
                        {rowId ? (
                          <div className="flex items-center gap-2">
                            {canUpdate ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(key)}
                                className="admin-button-secondary px-3 py-1.5 text-xs"
                              >
                                {isExpanded ? "Cancel" : "Edit"}
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
                                <button
                                  type="submit"
                                  className="admin-button-danger px-3 py-1.5 text-xs"
                                >
                                  Delete
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Missing ID</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && canUpdate ? (
                      <tr className="bg-white/45">
                        <td colSpan={9} className="px-5 py-4.5">
                          {rowId ? (
                            <form action={updateAction} onSubmit={(event) => handleEditSubmit(rowId, event)} className="space-y-4">
                              <input type="hidden" name="resource_key" value={resourceKey} />
                              <input type="hidden" name="redirect_path" value={redirectPath} />
                              <input type="hidden" name="row_id" value={rowId} />
                              <input type="hidden" name="id_column" value={idColumn ?? "id"} />
                              <input type="hidden" name="editable_columns" value={fieldsJson} />
                              <input type="hidden" name="field_kinds" value={kindsJson} />
                              <input type="hidden" name="required_columns" value={requiredColumnsJson} />

                              {editValidationErrors[rowId] ? (
                                <p className="admin-alert-danger text-sm">{editValidationErrors[rowId]}</p>
                              ) : null}

                              <div className="grid gap-3 lg:grid-cols-2">
                                {orderedEditColumns.map((column) => {
                                  const value = row[column];
                                  const isRequired = requiredColumnSet.has(column);
                                  const kind = columnKinds[column] ?? "string";

                                  if (column === "caption" || column === "image_description" || column === "explanation") {
                                    return (
                                      <label key={`${key}-edit-${column}`} className={column === "caption" ? "lg:col-span-2" : "block"}>
                                        <FieldLabel label={formatLabel(column)} required={isRequired} />
                                        <textarea
                                          name={`field:${column}`}
                                          defaultValue={toFieldValue(value)}
                                          required={isRequired}
                                          rows={column === "caption" ? 2 : 3}
                                          className="admin-input"
                                        />
                                      </label>
                                    );
                                  }

                                  return (
                                    <label key={`${key}-edit-${column}`} className="block">
                                      <FieldLabel label={formatLabel(column)} required={isRequired} />
                                      <input
                                        name={`field:${column}`}
                                        type={kind === "number" ? "number" : "text"}
                                        step={kind === "number" ? "any" : undefined}
                                        defaultValue={toFieldValue(value)}
                                        required={isRequired}
                                        className={`admin-input ${column.endsWith("_id") ? "font-mono" : ""}`}
                                      />
                                    </label>
                                  );
                                })}
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  className="admin-button-secondary px-3 py-1.5 text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-400">Missing ID</span>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                  {query.trim().length > 0 ? "No caption examples match your search." : "No caption examples found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {displayColumns.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
          No display columns were detected.
        </p>
      ) : null}
    </div>
  );
}
