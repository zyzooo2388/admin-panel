const UTC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type FormatUtcDateOptions = {
  emptyFallback?: string;
  invalidFallback?: string;
  preserveInvalid?: boolean;
  includeSeconds?: boolean;
};

function padUtcPart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatUtcDate(value: unknown, options: FormatUtcDateOptions = {}): string {
  const { emptyFallback = "-", invalidFallback = emptyFallback, preserveInvalid = false, includeSeconds = true } = options;

  if (value === null || value === undefined) {
    return emptyFallback;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return emptyFallback;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return preserveInvalid ? normalized : invalidFallback;
  }

  const month = UTC_MONTHS[date.getUTCMonth()];
  const day = padUtcPart(date.getUTCDate());
  const year = date.getUTCFullYear();
  const hours = padUtcPart(date.getUTCHours());
  const minutes = padUtcPart(date.getUTCMinutes());
  const seconds = padUtcPart(date.getUTCSeconds());
  const time = includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;

  return `${month} ${day}, ${year}, ${time} UTC`;
}
