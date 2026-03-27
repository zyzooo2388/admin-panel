export function formatUtcDate(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "-";
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString();
}
