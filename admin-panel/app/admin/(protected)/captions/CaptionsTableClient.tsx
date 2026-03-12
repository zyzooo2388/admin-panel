"use client";

import { Fragment, useMemo, useState } from "react";

export type CaptionRow = {
  id: string | null;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  content: string | null;
  is_public: boolean | null;
  profile_id: string | null;
  image_id: string | null;
  humor_flavor_id: string | null;
  is_featured: boolean | null;
  caption_request_id: string | null;
  like_count: number | null;
  llm_prompt_chain_id: string | null;
};

type Props = {
  rows: CaptionRow[];
  errorMessage: string | null;
  totalCount: number | null;
  humorFlavorMap: Record<string, string>;
};

const UTC_DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const CAPTION_PREVIEW_LENGTH = 260;

function formatUtcDatetime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${UTC_DATETIME_FORMATTER.format(date)} UTC`;
}

function previewCaption(content: string | null): string {
  if (!content) {
    return "No caption content";
  }

  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No caption content";
  }

  if (normalized.length <= CAPTION_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, CAPTION_PREVIEW_LENGTH - 3)}...`;
}

function shortId(value: string | null): string {
  if (!value) {
    return "None";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function toFiniteNumber(value: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function normalizeSearch(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).toLowerCase();
}

export default function CaptionsTableClient({ rows, errorMessage, totalCount, humorFlavorMap }: Props) {
  const [query, setQuery] = useState("");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((row) => {
      const searchableValues = [
        normalizeSearch(row.content),
        normalizeSearch(row.id),
        normalizeSearch(row.image_id),
        normalizeSearch(row.caption_request_id),
        normalizeSearch(row.llm_prompt_chain_id),
        normalizeSearch(row.humor_flavor_id),
      ];

      return searchableValues.some((value) => value.includes(search));
    });
  }, [query, rows]);

  const stats = useMemo(() => {
    const publicCount = rows.filter((row) => row.is_public === true).length;
    const featuredCount = rows.filter((row) => row.is_featured === true).length;
    const likeValues = rows.map((row) => toFiniteNumber(row.like_count)).filter((value): value is number => value !== null);
    const likesTotal = likeValues.reduce((sum, value) => sum + value, 0);
    const averageLikes = likeValues.length > 0 ? likesTotal / likeValues.length : 0;

    return {
      publicCount,
      featuredCount,
      averageLikes,
    };
  }, [rows]);

  const summary = useMemo(() => {
    const loaded = rows.length.toLocaleString();
    const matched = filteredRows.length.toLocaleString();
    const tableTotal = typeof totalCount === "number" ? totalCount.toLocaleString() : null;

    if (query.trim().length > 0) {
      if (tableTotal) {
        return `Showing ${matched} of ${loaded} loaded captions (${tableTotal} total).`;
      }

      return `Showing ${matched} of ${loaded} loaded captions.`;
    }

    if (tableTotal) {
      return `Showing ${loaded} loaded captions (${tableTotal} total).`;
    }

    return `Showing ${loaded} captions.`;
  }, [filteredRows.length, query, rows.length, totalCount]);

  function rowKey(row: CaptionRow, index: number) {
    if (row.id) {
      return row.id;
    }
    return `row-${index}`;
  }

  function resolveFlavor(row: CaptionRow) {
    if (!row.humor_flavor_id) {
      return "None";
    }

    return humorFlavorMap[row.humor_flavor_id] ?? `Flavor #${row.humor_flavor_id}`;
  }

  function toggleExpanded(key: string) {
    setExpandedRowKey((current) => (current === key ? null : key));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Captions</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Read-only caption records from <code>public.captions</code>.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Captions</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{totalCount ?? rows.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Public</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{stats.publicCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Featured</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{stats.featuredCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Avg Likes (Loaded)</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{stats.averageLikes.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-700">{summary}</p>
        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search content, caption ID, image ID, request ID, prompt chain ID, flavor ID..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">Click a row to view full caption and metadata.</p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-36" />
          </colgroup>
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Caption</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Likes</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Humor Flavor</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Image ID</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Prompt Chain</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-sm text-red-600" colSpan={10}>
                  {errorMessage}
                </td>
              </tr>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const key = rowKey(row, index);
                const isExpanded = expandedRowKey === key;
                const likeCount = toFiniteNumber(row.like_count);
                const likeToneClass =
                  likeCount !== null && likeCount < 0
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-zinc-200 bg-zinc-100 text-zinc-700";

                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-t border-zinc-100 align-top text-zinc-700 transition-colors hover:bg-zinc-50/90"
                      onClick={() => toggleExpanded(key)}
                    >
                      <td className="px-4 py-4">
                        <div className="max-w-4xl">
                          <p className={row.content ? "leading-6 text-zinc-900" : "leading-6 text-zinc-400"} title={row.content ?? "No caption content"}>
                            {previewCaption(row.content)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {row.is_public === true ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            Private
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {likeCount !== null ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${likeToneClass}`}>
                            {likeCount}
                          </span>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.is_featured === true ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            Featured
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Not featured</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.humor_flavor_id ? (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                            {resolveFlavor(row)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-500">{formatUtcDatetime(row.created_datetime_utc)}</td>
                      <td className="px-4 py-4" title={row.image_id ?? "None"}>
                        {row.image_id ? (
                          <span className="font-mono text-xs text-zinc-500">{shortId(row.image_id)}</span>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.caption_request_id ? (
                          <span className="font-mono text-xs text-zinc-600">{row.caption_request_id}</span>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.llm_prompt_chain_id ? (
                          <span className="font-mono text-xs text-zinc-600">{row.llm_prompt_chain_id}</span>
                        ) : (
                          <span className="text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-zinc-400">{row.id ?? "-"}</td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/70">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Full Caption</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-6 text-zinc-800">
                                {row.content?.trim() || "No caption content"}
                              </p>
                            </div>
                            <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                              <p>
                                <span className="font-semibold text-zinc-700">Image ID:</span> {row.image_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Profile ID:</span> {row.profile_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Humor Flavor:</span> {resolveFlavor(row)}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Request:</span> {row.caption_request_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Prompt Chain:</span> {row.llm_prompt_chain_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Created:</span> {formatUtcDatetime(row.created_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Modified:</span> {formatUtcDatetime(row.modified_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-zinc-700">Caption ID:</span> {row.id ?? "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={10}>
                  No captions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
