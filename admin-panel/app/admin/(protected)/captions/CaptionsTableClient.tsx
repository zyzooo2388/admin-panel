"use client";

import { Fragment, useMemo, useState } from "react";

import CopyButton from "@/components/admin/CopyButton";
import { formatUtcDate } from "@/lib/dates/formatUtcDate";

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

type QuickFilterKey = "all" | "public" | "featured" | "high-like" | "recent" | "no-flavor";

const CAPTION_PREVIEW_LENGTH = 260;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatUtcDatetime(value: string | null): string {
  return formatUtcDate(value);
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

function isRecentCaption(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return Date.now() - parsed.getTime() <= ONE_WEEK_MS;
}

function rowMatchesQuickFilter(row: CaptionRow, filter: QuickFilterKey): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "public") {
    return row.is_public === true;
  }

  if (filter === "featured") {
    return row.is_featured === true;
  }

  if (filter === "high-like") {
    return (toFiniteNumber(row.like_count) ?? 0) >= 10;
  }

  if (filter === "recent") {
    return isRecentCaption(row.created_datetime_utc);
  }

  if (filter === "no-flavor") {
    return !row.humor_flavor_id;
  }

  return true;
}

export default function CaptionsTableClient({ rows, errorMessage, totalCount, humorFlavorMap }: Props) {
  const [query, setQuery] = useState("");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");

  const quickFilterCounts = useMemo(
    () => ({
      all: rows.length,
      public: rows.filter((row) => row.is_public === true).length,
      featured: rows.filter((row) => row.is_featured === true).length,
      "high-like": rows.filter((row) => (toFiniteNumber(row.like_count) ?? 0) >= 10).length,
      recent: rows.filter((row) => isRecentCaption(row.created_datetime_utc)).length,
      "no-flavor": rows.filter((row) => !row.humor_flavor_id).length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (!rowMatchesQuickFilter(row, quickFilter)) {
        return false;
      }

      if (!search) {
        return true;
      }

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
  }, [query, rows, quickFilter]);

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

    if (query.trim().length > 0 || quickFilter !== "all") {
      if (tableTotal) {
        return `Showing ${matched} of ${loaded} loaded captions (${tableTotal} total).`;
      }

      return `Showing ${matched} of ${loaded} loaded captions.`;
    }

    if (tableTotal) {
      return `Showing ${loaded} loaded captions (${tableTotal} total).`;
    }

    return `Showing ${loaded} captions.`;
  }, [filteredRows.length, query, quickFilter, rows.length, totalCount]);

  function rowKey(row: CaptionRow, index: number): string {
    if (row.id) {
      return row.id;
    }
    return `row-${index}`;
  }

  function resolveFlavor(row: CaptionRow): string {
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
      <h1 className="admin-page-title">Captions</h1>
      <p className="admin-page-description">
        Read-only caption records from <code>public.captions</code>.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Captions</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalCount ?? rows.length}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Public</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.publicCount}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Featured</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.featuredCount}</p>
        </div>
        <div className="admin-stat-card px-5 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg Likes (Loaded)</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.averageLikes.toFixed(2)}</p>
        </div>
      </div>

      <section className="admin-toolbar-card mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="admin-summary-pill">{summary}</p>
        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search content, caption ID, image ID, request ID, prompt chain ID, flavor ID..."
            className="admin-input"
          />
        </div>
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "public", label: "Public" },
          { key: "featured", label: "Featured" },
          { key: "high-like", label: "10+ Likes" },
          { key: "recent", label: "Last 7 Days" },
          { key: "no-flavor", label: "No Flavor" },
        ].map((filterOption) => {
          const key = filterOption.key as QuickFilterKey;
          const active = key === quickFilter;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setQuickFilter(key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                active
                  ? "admin-filter-chip admin-filter-chip-active"
                  : "admin-filter-chip hover:border-slate-300 hover:bg-white/90"
              }`}
            >
              <span>{filterOption.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-indigo-600/90" : "bg-slate-100"}`}>
                {quickFilterCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-500">Click a row to view full caption and metadata.</p>

      <div className="admin-table-wrap mt-5">
        <table className="admin-table min-w-full table-fixed">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-44" />
            <col className="w-40" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-44" />
          </colgroup>
          <thead className="text-left">
            <tr>
              <th className="px-5 py-3.5">Caption</th>
              <th className="px-5 py-3.5">Visibility</th>
              <th className="px-5 py-3.5">Likes</th>
              <th className="px-5 py-3.5">Featured</th>
              <th className="px-5 py-3.5">Humor Flavor</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Image ID</th>
              <th className="px-5 py-3.5">Request</th>
              <th className="px-5 py-3.5">Prompt Chain</th>
              <th className="px-5 py-3.5">ID</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-5 py-4.5 text-sm text-red-600" colSpan={10}>
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
                    : "border-slate-200 bg-slate-100 text-slate-700";

                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(key)}
                    >
                      <td className="px-5 py-4.5">
                        <div className="max-w-4xl">
                          <p className={row.content ? "leading-6 text-slate-900" : "leading-6 text-slate-400"} title={row.content ?? "No caption content"}>
                            {previewCaption(row.content)}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4.5">
                        {row.is_public === true ? (
                          <span className="admin-badge border-emerald-200 bg-emerald-50/90 text-emerald-700">
                            Public
                          </span>
                        ) : (
                          <span className="admin-badge">
                            Private
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {likeCount !== null ? (
                          <span className={`admin-badge font-mono ${likeToneClass}`}>
                            {likeCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {row.is_featured === true ? (
                          <span className="admin-badge border-amber-200 bg-amber-50/90 text-amber-700">
                            Featured
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not featured</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {row.humor_flavor_id ? (
                          <span className="admin-badge">
                            {resolveFlavor(row)}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5 text-xs text-slate-500">{formatUtcDatetime(row.created_datetime_utc)}</td>
                      <td className="px-5 py-4.5" title={row.image_id ?? "None"}>
                        {row.image_id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{shortId(row.image_id)}</span>
                            <CopyButton value={row.image_id} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {row.caption_request_id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{shortId(row.caption_request_id)}</span>
                            <CopyButton value={row.caption_request_id} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        {row.llm_prompt_chain_id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{shortId(row.llm_prompt_chain_id)}</span>
                            <CopyButton value={row.llm_prompt_chain_id} label="Copy" />
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">{shortId(row.id)}</span>
                          <CopyButton value={row.id} label="Copy" />
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="bg-white/45">
                        <td colSpan={10} className="px-5 py-4.5">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Full Caption</p>
                              <p className="admin-soft-panel mt-2 whitespace-pre-wrap p-3 text-sm leading-6 text-slate-800">
                                {row.content?.trim() || "No caption content"}
                              </p>
                            </div>
                            <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                              <p>
                                <span className="font-semibold text-slate-700">Image ID:</span> {row.image_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Profile ID:</span> {row.profile_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Humor Flavor:</span> {resolveFlavor(row)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Request:</span> {row.caption_request_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Prompt Chain:</span> {row.llm_prompt_chain_id ?? "None"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Created:</span> {formatUtcDatetime(row.created_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Modified:</span> {formatUtcDatetime(row.modified_datetime_utc)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">Caption ID:</span> {row.id ?? "-"}
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
                <td className="px-5 py-8 text-center text-slate-500" colSpan={10}>
                  No captions match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
