import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { CAPTION_TEXT_FALLBACK_COLUMNS, CREATED_TIMESTAMP_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import DashboardChartsClient from "./dashboard/DashboardChartsClient";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type CountCard = {
  label: string;
  value: number | null;
  hint?: string;
};

type FlavorCountPoint = {
  flavor: string;
  count: number;
};

type DailyPoint = {
  day: string;
  label: string;
  requests: number;
  images: number;
};

type RatingsDailyPoint = {
  day: string;
  label: string;
  likes: number;
  dislikes: number;
  total: number;
};

type CaptionRatingSummary = {
  totalRatings: number;
  totalLikes: number;
  totalDislikes: number;
  likeRate: number | null;
  dislikeRate: number | null;
  netScore: number;
};

type TopCaptionInsight = {
  captionId: string;
  caption: string;
  totalRatings: number;
  likes: number;
  dislikes: number;
  netScore: number;
};

type TopFlavorInsight = {
  flavor: string;
  totalRatings: number;
  likes: number;
  dislikes: number;
  likeRate: number;
};

type RecentRatingInsight = {
  id: string;
  caption: string;
  voteValue: number;
  createdAtLabel: string;
};

type CaptionRatingInsights = {
  summary: CaptionRatingSummary;
  ratingsOverTime: RatingsDailyPoint[];
  topCaptions: TopCaptionInsight[];
  topFlavors: TopFlavorInsight[];
  recentRatings: RecentRatingInsight[];
  hasRatingData: boolean;
};

type CaptionFlavorRow = {
  humor_flavor_id?: string | number | null;
};

type TimestampRow = {
  id?: string | number | null;
  [key: string]: unknown;
};

type CaptionVoteRow = {
  caption_id?: string | number | null;
  vote_value?: unknown;
  created_datetime_utc?: unknown;
  [key: string]: unknown;
};

type CaptionLookupRow = {
  id?: string | number | null;
  humor_flavor_id?: string | number | null;
  [key: string]: unknown;
};

const PAGE_SIZE = 1000;
const DAILY_WINDOW_DAYS = 7;
const RATINGS_WINDOW_DAYS = 14;
const TOP_CAPTIONS_LIMIT = 5;
const TOP_FLAVORS_LIMIT = 5;
const RECENT_RATINGS_LIMIT = 6;

function formatAverage(totalCaptions: number | null, totalImages: number | null): string {
  if (totalCaptions === null || totalImages === null) {
    return "Unavailable";
  }

  if (totalImages === 0) {
    return "0.00";
  }

  return (totalCaptions / totalImages).toFixed(2);
}

function toShortDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function toDayKey(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0 || values.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function normalizeRows(data: unknown): TimestampRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((row): row is TimestampRow => typeof row === "object" && row !== null);
}

async function getTableCount(supabase: SupabaseServerClient, tableName: string): Promise<number | null> {
  try {
    const { count, error } = await supabase.from(tableName).select("*", { count: "exact", head: true });
    if (error) {
      return null;
    }

    return count ?? 0;
  } catch {
    return null;
  }
}

async function getCaptionsByFlavor(supabase: SupabaseServerClient): Promise<FlavorCountPoint[]> {
  const { data, error } = await supabase.from("captions").select("humor_flavor_id").limit(5000);
  if (error || !data) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data as CaptionFlavorRow[]) {
    const rawId = row.humor_flavor_id;
    if (rawId === null || rawId === undefined || String(rawId).trim().length === 0) {
      continue;
    }

    const id = String(rawId);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const flavorIds = [...counts.keys()];
  let flavorMap = new Map<string, string>();

  if (flavorIds.length > 0) {
    const { data: flavorRows } = await supabase.from("humor_flavors").select("id, slug, name").in("id", flavorIds);
    flavorMap = new Map(
      ((flavorRows as Array<Record<string, unknown>> | null) ?? [])
        .map((row) => {
          const id = row.id === null || row.id === undefined ? null : String(row.id);
          if (!id) {
            return null;
          }

          const slug = typeof row.slug === "string" && row.slug.trim() ? row.slug.trim() : null;
          const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
          return [id, name ?? slug ?? `Flavor ${id}`] as const;
        })
        .filter((entry): entry is readonly [string, string] => Array.isArray(entry)),
    );
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, count]) => ({
      flavor: flavorMap.get(id) ?? `Flavor ${id}`,
      count,
    }));
}

async function getDailyCounts(
  supabase: SupabaseServerClient,
  tableName: string,
  timestampColumn: string | null,
): Promise<Map<string, number>> {
  if (!timestampColumn) {
    return new Map();
  }

  const counts = new Map<string, number>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(tableName).select(`id, ${timestampColumn}`).range(from, to);
    const rows = normalizeRows(data);

    if (error || rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const timestampValue = row[timestampColumn];
      if (timestampValue === null || timestampValue === undefined) {
        continue;
      }

      const key = toDayKey(timestampValue);
      if (!key) {
        continue;
      }

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return counts;
}

async function getDailyVolume(supabase: SupabaseServerClient): Promise<DailyPoint[]> {
  const [requestTimestampColumn, imageTimestampColumn] = await Promise.all([
    pickFirstWorkingColumn(supabase, "caption_requests", CREATED_TIMESTAMP_FALLBACK_COLUMNS),
    pickFirstWorkingColumn(supabase, "images", CREATED_TIMESTAMP_FALLBACK_COLUMNS),
  ]);

  const [requestCounts, imageCounts] = await Promise.all([
    getDailyCounts(supabase, "caption_requests", requestTimestampColumn),
    getDailyCounts(supabase, "images", imageTimestampColumn),
  ]);

  const today = new Date();
  const days: DailyPoint[] = [];

  for (let offset = DAILY_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const dayKey = date.toISOString().slice(0, 10);

    days.push({
      day: dayKey,
      label: toShortDateLabel(date),
      requests: requestCounts.get(dayKey) ?? 0,
      images: imageCounts.get(dayKey) ?? 0,
    });
  }

  return days.some((item) => item.requests > 0 || item.images > 0) ? days : [];
}

async function getCaptionRatingInsights(supabase: SupabaseServerClient): Promise<CaptionRatingInsights> {
  const [voteValueColumn, voteCaptionColumn, voteCreatedColumn] = await Promise.all([
    pickFirstWorkingColumn(supabase, "caption_votes", ["vote_value"]),
    pickFirstWorkingColumn(supabase, "caption_votes", ["caption_id"]),
    pickFirstWorkingColumn(supabase, "caption_votes", ["created_datetime_utc"]),
  ]);

  const emptySummary: CaptionRatingSummary = {
    totalRatings: 0,
    totalLikes: 0,
    totalDislikes: 0,
    likeRate: null,
    dislikeRate: null,
    netScore: 0,
  };

  if (!voteValueColumn || !voteCaptionColumn || !voteCreatedColumn) {
    return {
      summary: emptySummary,
      ratingsOverTime: [],
      topCaptions: [],
      topFlavors: [],
      recentRatings: [],
      hasRatingData: false,
    };
  }

  const perCaptionStats = new Map<string, { likes: number; dislikes: number; total: number; netScore: number }>();
  const perDayStats = new Map<string, { likes: number; dislikes: number }>();
  const recentVotes: Array<{ captionId: string; voteValue: number; createdAt: string }> = [];
  let totalLikes = 0;
  let totalDislikes = 0;

  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("caption_votes")
      .select(`${voteCaptionColumn}, ${voteValueColumn}, ${voteCreatedColumn}`)
      .range(from, to);

    const rows = normalizeRows(data) as CaptionVoteRow[];
    if (error || rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const captionRaw = row[voteCaptionColumn];
      if (captionRaw === null || captionRaw === undefined) {
        continue;
      }
      const captionId = String(captionRaw).trim();
      if (!captionId) {
        continue;
      }

      const numericVote = toFiniteNumber(row[voteValueColumn]);
      if (numericVote === null || numericVote === 0) {
        continue;
      }
      const voteValue = numericVote > 0 ? 1 : -1;

      const nextCaptionStats = perCaptionStats.get(captionId) ?? { likes: 0, dislikes: 0, total: 0, netScore: 0 };
      if (voteValue > 0) {
        nextCaptionStats.likes += 1;
        totalLikes += 1;
      } else {
        nextCaptionStats.dislikes += 1;
        totalDislikes += 1;
      }
      nextCaptionStats.total += 1;
      nextCaptionStats.netScore += voteValue;
      perCaptionStats.set(captionId, nextCaptionStats);

      const dayKey = toDayKey(row[voteCreatedColumn]);
      if (dayKey) {
        const nextDay = perDayStats.get(dayKey) ?? { likes: 0, dislikes: 0 };
        if (voteValue > 0) {
          nextDay.likes += 1;
        } else {
          nextDay.dislikes += 1;
        }
        perDayStats.set(dayKey, nextDay);
      }

      const createdAtRaw = row[voteCreatedColumn];
      if (typeof createdAtRaw === "string" && createdAtRaw.trim().length > 0) {
        recentVotes.push({
          captionId,
          voteValue,
          createdAt: createdAtRaw,
        });
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  const totalRatings = totalLikes + totalDislikes;
  const likeRate = totalRatings > 0 ? totalLikes / totalRatings : null;
  const dislikeRate = totalRatings > 0 ? totalDislikes / totalRatings : null;
  const netScore = totalLikes - totalDislikes;

  if (totalRatings === 0) {
    return {
      summary: {
        totalRatings,
        totalLikes,
        totalDislikes,
        likeRate,
        dislikeRate,
        netScore,
      },
      ratingsOverTime: [],
      topCaptions: [],
      topFlavors: [],
      recentRatings: [],
      hasRatingData: false,
    };
  }

  const captionTextColumn = await pickFirstWorkingColumn(supabase, "captions", CAPTION_TEXT_FALLBACK_COLUMNS);
  const captionIds = [...perCaptionStats.keys()];
  const captionMeta = new Map<string, { caption: string; humorFlavorId: string | null }>();
  const flavorIds = new Set<string>();

  for (const chunk of chunkValues(captionIds, 250)) {
    const selectColumns = ["id", "humor_flavor_id"];
    if (captionTextColumn) {
      selectColumns.push(captionTextColumn);
    }

    const { data, error } = await supabase.from("captions").select(selectColumns.join(", ")).in("id", chunk);
    if (error || !Array.isArray(data)) {
      continue;
    }

    const rows = normalizeRows(data) as CaptionLookupRow[];
    for (const row of rows) {
      if (row.id === null || row.id === undefined) {
        continue;
      }
      const id = String(row.id);
      const flavorRaw = row.humor_flavor_id;
      const humorFlavorId = flavorRaw === null || flavorRaw === undefined ? null : String(flavorRaw);
      const captionRaw = captionTextColumn ? row[captionTextColumn] : null;
      const caption =
        typeof captionRaw === "string" && captionRaw.trim().length > 0 ? captionRaw.trim() : `Caption ${id.slice(0, 8)}`;

      captionMeta.set(id, { caption, humorFlavorId });
      if (humorFlavorId) {
        flavorIds.add(humorFlavorId);
      }
    }
  }

  const flavorNameMap = new Map<string, string>();
  for (const chunk of chunkValues([...flavorIds], 250)) {
    const { data, error } = await supabase.from("humor_flavors").select("id, slug, name").in("id", chunk);
    if (error || !Array.isArray(data)) {
      continue;
    }

    const rows = normalizeRows(data) as Array<Record<string, unknown>>;
    for (const row of rows) {
      if (row.id === null || row.id === undefined) {
        continue;
      }
      const id = String(row.id);
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
      const slug = typeof row.slug === "string" && row.slug.trim() ? row.slug.trim() : null;
      flavorNameMap.set(id, name ?? slug ?? `Flavor ${id}`);
    }
  }

  const topCaptions = [...perCaptionStats.entries()]
    .sort((a, b) => {
      if (b[1].total !== a[1].total) {
        return b[1].total - a[1].total;
      }
      return b[1].netScore - a[1].netScore;
    })
    .slice(0, TOP_CAPTIONS_LIMIT)
    .map(([captionId, stat]) => ({
      captionId,
      caption: captionMeta.get(captionId)?.caption ?? `Caption ${captionId.slice(0, 8)}`,
      totalRatings: stat.total,
      likes: stat.likes,
      dislikes: stat.dislikes,
      netScore: stat.netScore,
    }));

  const perFlavorStats = new Map<string, { likes: number; dislikes: number; total: number }>();
  for (const [captionId, stat] of perCaptionStats.entries()) {
    const flavorId = captionMeta.get(captionId)?.humorFlavorId;
    if (!flavorId) {
      continue;
    }
    const nextFlavor = perFlavorStats.get(flavorId) ?? { likes: 0, dislikes: 0, total: 0 };
    nextFlavor.likes += stat.likes;
    nextFlavor.dislikes += stat.dislikes;
    nextFlavor.total += stat.total;
    perFlavorStats.set(flavorId, nextFlavor);
  }

  const topFlavors = [...perFlavorStats.entries()]
    .map(([flavorId, stat]) => ({
      flavor: flavorNameMap.get(flavorId) ?? `Flavor ${flavorId}`,
      totalRatings: stat.total,
      likes: stat.likes,
      dislikes: stat.dislikes,
      likeRate: stat.total > 0 ? stat.likes / stat.total : 0,
    }))
    .sort((a, b) => {
      if (b.likeRate !== a.likeRate) {
        return b.likeRate - a.likeRate;
      }
      return b.totalRatings - a.totalRatings;
    })
    .slice(0, TOP_FLAVORS_LIMIT);

  const today = new Date();
  const ratingsOverTime: RatingsDailyPoint[] = [];
  for (let offset = RATINGS_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const dayKey = date.toISOString().slice(0, 10);
    const counts = perDayStats.get(dayKey) ?? { likes: 0, dislikes: 0 };
    ratingsOverTime.push({
      day: dayKey,
      label: toShortDateLabel(date),
      likes: counts.likes,
      dislikes: counts.dislikes,
      total: counts.likes + counts.dislikes,
    });
  }

  const recentRatings = recentVotes
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_RATINGS_LIMIT)
    .map((item, index) => {
      const createdAt = new Date(item.createdAt);
      const createdAtLabel = Number.isNaN(createdAt.getTime())
        ? "Unknown time"
        : `${createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}, ${createdAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "UTC",
          })} UTC`;

      return {
        id: `${item.captionId}-${item.createdAt}-${index}`,
        caption: captionMeta.get(item.captionId)?.caption ?? `Caption ${item.captionId.slice(0, 8)}`,
        voteValue: item.voteValue,
        createdAtLabel,
      };
    });

  return {
    summary: {
      totalRatings,
      totalLikes,
      totalDislikes,
      likeRate,
      dislikeRate,
      netScore,
    },
    ratingsOverTime,
    topCaptions,
    topFlavors,
    recentRatings,
    hasRatingData: totalRatings > 0,
  };
}

export default async function AdminDashboardPage() {
  await requireSuperadmin();

  const supabase = await createSupabaseServerClient();

  const [totalProfiles, totalImages, totalHumorFlavors, totalCaptions, totalCaptionRequests, captionsByFlavor, dailyVolume, captionRatingInsights] =
    await Promise.all([
      getTableCount(supabase, "profiles"),
      getTableCount(supabase, "images"),
      getTableCount(supabase, "humor_flavors"),
      getTableCount(supabase, "captions"),
      getTableCount(supabase, "caption_requests"),
      getCaptionsByFlavor(supabase),
      getDailyVolume(supabase),
      getCaptionRatingInsights(supabase),
    ]);

  const countCards: CountCard[] = [
    {
      label: "Total Users",
      value: totalProfiles,
      hint: "Profiles in the admin system",
    },
    {
      label: "Total Images",
      value: totalImages,
      hint: "Uploaded image records",
    },
    {
      label: "Total Humor Flavors",
      value: totalHumorFlavors,
      hint: "Configured prompt personalities",
    },
    {
      label: "Total Captions",
      value: totalCaptions,
      hint: `Avg ${formatAverage(totalCaptions, totalImages)} per image`,
    },
    {
      label: "Total Caption Requests",
      value: totalCaptionRequests,
      hint: "Requests submitted to the pipeline",
    },
  ];

  return (
    <DashboardChartsClient
      countCards={countCards}
      captionsByFlavor={captionsByFlavor}
      dailyVolume={dailyVolume}
      captionRatingInsights={captionRatingInsights}
    />
  );
}
