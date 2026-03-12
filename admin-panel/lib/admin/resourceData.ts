import type { SupabaseClient } from "@supabase/supabase-js";

import { pickFirstWorkingColumn } from "@/lib/db/columnFallback";

import { ADMIN_RESOURCE_CONFIGS, type AdminResourceConfig, type AdminResourceKey } from "./resources";

export type ColumnKind = "string" | "number" | "boolean" | "json";

export type LoadedAdminResource = {
  config: AdminResourceConfig;
  tableName: string | null;
  rows: Record<string, unknown>[];
  error: string | null;
  idColumn: string | null;
  displayColumns: string[];
  editableColumns: string[];
  orderColumn: string | null;
  columnKinds: Record<string, ColumnKind>;
};

const NON_EDITABLE_COLUMNS = new Set([
  "id",
  "created_at",
  "created_datetime_utc",
  "createdAt",
  "inserted_at",
  "updated_at",
  "updatedAt",
  "deleted_at",
]);

function isValidColumnName(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function dedupeColumns(columns: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const column of columns) {
    if (!isValidColumnName(column) || seen.has(column)) {
      continue;
    }
    seen.add(column);
    result.push(column);
  }

  return result;
}

export function getResourceConfig(resourceKey: AdminResourceKey): AdminResourceConfig {
  return ADMIN_RESOURCE_CONFIGS[resourceKey];
}

export function inferColumnKinds(rows: Record<string, unknown>[], columns: string[]): Record<string, ColumnKind> {
  const kinds: Record<string, ColumnKind> = {};

  for (const column of columns) {
    let kind: ColumnKind = "string";

    for (const row of rows) {
      const value = row[column];
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "boolean") {
        kind = "boolean";
      } else if (typeof value === "number") {
        kind = "number";
      } else if (typeof value === "object") {
        kind = "json";
      } else {
        kind = "string";
      }
      break;
    }

    kinds[column] = kind;
  }

  return kinds;
}

function normalizeCellValue(value: unknown): string {
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

function inferAdditionalColumns(rows: Record<string, unknown>[], knownColumns: string[]) {
  const knownSet = new Set(knownColumns);
  const extras: string[] = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!knownSet.has(key) && isValidColumnName(key)) {
        knownSet.add(key);
        extras.push(key);
      }
    }
  }

  return extras;
}

export async function resolveTableName(
  supabase: SupabaseClient,
  tableCandidates: string[],
): Promise<{ tableName: string | null; error: string | null }> {
  let lastError: string | null = null;

  for (const tableName of tableCandidates) {
    const { error } = await supabase.from(tableName).select("*").limit(1);

    if (!error) {
      return { tableName, error: null };
    }

    const message = String(error.message || "").toLowerCase();
    const isMissingTable =
      error.code === "PGRST205" || message.includes("could not find the table") || message.includes("does not exist");

    if (!isMissingTable) {
      return { tableName, error: `Failed to access table '${tableName}': ${error.message}` };
    }

    lastError = error.message;
  }

  return {
    tableName: null,
    error: lastError
      ? `No matching table found for candidates: ${tableCandidates.join(", ")} (last error: ${lastError})`
      : `No matching table found for candidates: ${tableCandidates.join(", ")}`,
  };
}

async function pickWorkingColumns(
  supabase: SupabaseClient,
  tableName: string,
  candidates: string[],
  probeColumn = "id",
): Promise<string[]> {
  const columns: string[] = [];

  for (const candidate of dedupeColumns(candidates)) {
    const found = await pickFirstWorkingColumn(supabase, tableName, [candidate], probeColumn);
    if (found && !columns.includes(found)) {
      columns.push(found);
    }
  }

  return columns;
}

function sortRows(rows: Record<string, unknown>[], orderColumn: string | null): Record<string, unknown>[] {
  if (!orderColumn) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    const av = a[orderColumn];
    const bv = b[orderColumn];

    const at = new Date(String(av ?? "")).getTime();
    const bt = new Date(String(bv ?? "")).getTime();

    if (!Number.isNaN(at) && !Number.isNaN(bt)) {
      return bt - at;
    }

    const an = typeof av === "number" ? av : Number.NaN;
    const bn = typeof bv === "number" ? bv : Number.NaN;

    if (!Number.isNaN(an) && !Number.isNaN(bn)) {
      return bn - an;
    }

    return normalizeCellValue(bv).localeCompare(normalizeCellValue(av));
  });
}

export async function loadAdminResource(
  supabase: SupabaseClient,
  resourceKey: AdminResourceKey,
  limit = 200,
): Promise<LoadedAdminResource> {
  const config = getResourceConfig(resourceKey);

  const tableResult = await resolveTableName(supabase, config.tableCandidates);
  if (!tableResult.tableName) {
    return {
      config,
      tableName: null,
      rows: [],
      error: tableResult.error,
      idColumn: null,
      displayColumns: [],
      editableColumns: [],
      orderColumn: null,
      columnKinds: {},
    };
  }

  const tableName = tableResult.tableName;
  const idColumn = await pickFirstWorkingColumn(supabase, tableName, ["id"]);
  const probeColumn = idColumn ?? config.listColumnCandidates[0] ?? "id";

  const candidateColumns = dedupeColumns([...(idColumn ? [idColumn] : []), ...config.listColumnCandidates]);
  const workingColumns = await pickWorkingColumns(supabase, tableName, candidateColumns, probeColumn);

  const orderColumn =
    (await pickFirstWorkingColumn(supabase, tableName, config.orderColumnCandidates, idColumn ?? "id")) ?? idColumn;

  const selectColumns = workingColumns.length > 0 ? workingColumns.join(", ") : "*";
  let query = supabase.from(tableName).select(selectColumns).limit(limit);

  if (orderColumn) {
    query = query.order(orderColumn, { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    return {
      config,
      tableName,
      rows: [],
      error: `Failed to load ${config.title.toLowerCase()}: ${error.message}`,
      idColumn,
      displayColumns: workingColumns,
      editableColumns: [],
      orderColumn,
      columnKinds: {},
    };
  }

  const rows = (data as unknown as Record<string, unknown>[] | null) ?? [];
  const additionalColumns = inferAdditionalColumns(rows, workingColumns);
  const displayColumns = dedupeColumns([...(idColumn ? [idColumn] : []), ...workingColumns, ...additionalColumns]).slice(0, 10);

  const candidateEditable = await pickWorkingColumns(supabase, tableName, config.editableColumnCandidates, probeColumn);
  const discoveredEditable = displayColumns.filter((column) => !NON_EDITABLE_COLUMNS.has(column));
  const editableColumns = dedupeColumns(candidateEditable.length > 0 ? candidateEditable : discoveredEditable).slice(0, 8);

  return {
    config,
    tableName,
    rows: sortRows(rows, orderColumn),
    error: null,
    idColumn,
    displayColumns,
    editableColumns,
    orderColumn,
    columnKinds: inferColumnKinds(rows, dedupeColumns([...displayColumns, ...editableColumns])),
  };
}
