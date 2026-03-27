type AdminDataCellProps = {
  value: unknown;
};

function formatShort(value: string, max = 120) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 3)}...`;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminDataCell({ value }: AdminDataCellProps) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">-</span>;
  }

  if (typeof value === "boolean") {
    return <span>{value ? "true" : "false"}</span>;
  }

  if (typeof value === "number") {
    return <span>{value}</span>;
  }

  const text = stringifyValue(value);
  const looksLikeUrl = /^https?:\/\//i.test(text);
  const longText = text.length > 140 || text.includes("\n") || text.startsWith("{") || text.startsWith("[");

  if (looksLikeUrl) {
    return (
      <a href={text} target="_blank" rel="noreferrer" className="block max-w-md truncate text-indigo-600 hover:underline" title={text}>
        {text}
      </a>
    );
  }

  if (longText) {
    return (
      <details>
        <summary className="cursor-pointer list-none text-slate-700 hover:text-slate-900">{formatShort(text, 120)}</summary>
        <pre className="mt-2 max-w-2xl overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-100 p-2 text-xs text-slate-700">{text}</pre>
      </details>
    );
  }

  return <span>{text}</span>;
}
