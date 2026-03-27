import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { CREATED_TIMESTAMP_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
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

type CaptionFlavorRow = {
  humor_flavor_id?: string | number | null;
};

type TimestampRow = {
  id?: string | number | null;
  [key: string]: unknown;
};

const PAGE_SIZE = 1000;
const DAILY_WINDOW_DAYS = 7;

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

export default async function AdminDashboardPage() {
  await requireSuperadmin();

  const supabase = await createSupabaseServerClient();

  const [totalProfiles, totalImages, totalHumorFlavors, totalCaptions, totalCaptionRequests, captionsByFlavor, dailyVolume] =
    await Promise.all([
      getTableCount(supabase, "profiles"),
      getTableCount(supabase, "images"),
      getTableCount(supabase, "humor_flavors"),
      getTableCount(supabase, "captions"),
      getTableCount(supabase, "caption_requests"),
      getCaptionsByFlavor(supabase),
      getDailyVolume(supabase),
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

  return <DashboardChartsClient countCards={countCards} captionsByFlavor={captionsByFlavor} dailyVolume={dailyVolume} />;
}
