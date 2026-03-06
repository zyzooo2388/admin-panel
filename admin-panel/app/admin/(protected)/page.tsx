import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import {
  CAPTION_TEXT_FALLBACK_COLUMNS,
  CREATED_TIMESTAMP_FALLBACK_COLUMNS,
  IMAGE_URL_FALLBACK_COLUMNS,
  pickFirstWorkingColumn,
} from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type CaptionDataRow = {
  id?: string | number | null;
  [key: string]: unknown;
};

type RankedItem = {
  id: string;
  count: number;
};

type RecentCaptionItem = {
  id: string;
  caption: string;
  userId: string;
  imageId: string;
  createdAt: string | null;
};

type DashboardStats = {
  totalProfiles: number | null;
  totalImages: number | null;
  totalCaptions: number | null;
  averageCaptionsPerImage: string;
  topImages: RankedItem[];
  topUsers: RankedItem[];
  recentCaptions: RecentCaptionItem[];
  longestCaptionSummary: string;
  longestCaptionLength: number;
  hasCreatedColumn: boolean;
};

function formatCount(value: number | null): string {
  if (value === null) {
    return "Unavailable";
  }

  return value.toLocaleString();
}

function truncateText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatAverage(totalCaptions: number | null, totalImages: number | null): string {
  if (totalCaptions === null || totalImages === null) {
    return "Unavailable";
  }

  if (totalImages === 0) {
    return "0.00";
  }

  return (totalCaptions / totalImages).toFixed(2);
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function toStringId(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function sortTopFive(counts: Map<string, number>): RankedItem[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));
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

async function getDashboardStats(supabase: SupabaseServerClient): Promise<DashboardStats> {
  const [totalProfiles, totalImages, totalCaptions] = await Promise.all([
    getTableCount(supabase, "profiles"),
    getTableCount(supabase, "images"),
    getTableCount(supabase, "captions"),
  ]);

  const captionTextColumn = await pickFirstWorkingColumn(supabase, "captions", CAPTION_TEXT_FALLBACK_COLUMNS);
  const captionCreatedColumn = await pickFirstWorkingColumn(supabase, "captions", CREATED_TIMESTAMP_FALLBACK_COLUMNS);
  const captionImageIdColumn = await pickFirstWorkingColumn(supabase, "captions", ["image_id"]);
  const captionUserIdColumn = await pickFirstWorkingColumn(supabase, "captions", ["user_id", "profile_id", "author_id"]);

  const aggregateColumns = ["id", captionTextColumn, captionImageIdColumn, captionUserIdColumn].filter(
    (column, index, self): column is string => Boolean(column) && self.indexOf(column) === index,
  );

  const imageCounts = new Map<string, number>();
  const userCounts = new Map<string, number>();
  let longestCaption = "";

  if (aggregateColumns.length > 0) {
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from("captions").select(aggregateColumns.join(", ")).range(from, to);

      if (error || !data || data.length === 0) {
        break;
      }

      for (const row of data as CaptionDataRow[]) {
        if (captionImageIdColumn) {
          const imageId = row[captionImageIdColumn];
          if (imageId !== null && imageId !== undefined && String(imageId).trim().length > 0) {
            const key = String(imageId);
            imageCounts.set(key, (imageCounts.get(key) ?? 0) + 1);
          }
        }

        if (captionUserIdColumn) {
          const userId = row[captionUserIdColumn];
          if (userId !== null && userId !== undefined && String(userId).trim().length > 0) {
            const key = String(userId);
            userCounts.set(key, (userCounts.get(key) ?? 0) + 1);
          }
        }

        if (captionTextColumn) {
          const raw = row[captionTextColumn];
          const text = typeof raw === "string" ? raw : String(raw ?? "");
          if (text.length > longestCaption.length) {
            longestCaption = text;
          }
        }
      }

      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }
  }

  const recentColumns = ["id", captionTextColumn, captionImageIdColumn, captionUserIdColumn, captionCreatedColumn].filter(
    (column, index, self): column is string => Boolean(column) && self.indexOf(column) === index,
  );

  let recentCaptions: RecentCaptionItem[] = [];
  if (recentColumns.length > 0) {
    let query = supabase.from("captions").select(recentColumns.join(", ")).limit(5);

    if (captionCreatedColumn) {
      query = query.order(captionCreatedColumn, { ascending: false });
    } else {
      query = query.order("id", { ascending: false });
    }

    const { data } = await query;

    recentCaptions = ((data ?? []) as CaptionDataRow[]).map((row) => {
      const rawCaption = captionTextColumn ? row[captionTextColumn] : "";
      const caption = truncateText(typeof rawCaption === "string" ? rawCaption : String(rawCaption ?? ""));

      return {
        id: toStringId(row.id),
        caption: caption || "-",
        userId: toStringId(captionUserIdColumn ? row[captionUserIdColumn] : null),
        imageId: toStringId(captionImageIdColumn ? row[captionImageIdColumn] : null),
        createdAt: captionCreatedColumn ? formatDate(row[captionCreatedColumn]) : null,
      };
    });
  }

  return {
    totalProfiles,
    totalImages,
    totalCaptions,
    averageCaptionsPerImage: formatAverage(totalCaptions, totalImages),
    topImages: sortTopFive(imageCounts),
    topUsers: sortTopFive(userCounts),
    recentCaptions,
    longestCaptionSummary: truncateText(longestCaption || "No captions found"),
    longestCaptionLength: longestCaption.length,
    hasCreatedColumn: Boolean(captionCreatedColumn),
  };
}

async function buildImageLabelMap(supabase: SupabaseServerClient, imageIds: string[]): Promise<Map<string, string>> {
  if (imageIds.length === 0) {
    return new Map();
  }

  const urlColumn = await pickFirstWorkingColumn(supabase, "images", IMAGE_URL_FALLBACK_COLUMNS);
  if (!urlColumn) {
    return new Map();
  }

  const { data, error } = await supabase.from("images").select(`id, ${urlColumn}`).in("id", imageIds);
  if (error || !data) {
    return new Map();
  }

  const entries = (data as Array<Record<string, unknown>>)
    .map((row) => [String(row.id), String(row[urlColumn] ?? "")] as const)
    .filter(([, label]) => label.length > 0)
    .map(([id, label]) => [id, truncateText(label, 72)] as const);

  return new Map(entries);
}

async function buildUserLabelMap(supabase: SupabaseServerClient, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const displayColumn = await pickFirstWorkingColumn(supabase, "profiles", ["email", "username", "full_name", "name"]);
  if (!displayColumn) {
    return new Map();
  }

  const { data, error } = await supabase.from("profiles").select(`id, ${displayColumn}`).in("id", userIds);
  if (error || !data) {
    return new Map();
  }

  const entries = (data as Array<Record<string, unknown>>)
    .map((row) => [String(row.id), String(row[displayColumn] ?? "")] as const)
    .filter(([, label]) => label.length > 0)
    .map(([id, label]) => [id, truncateText(label)] as const);

  return new Map(entries);
}

async function buildUserEmailMap(supabase: SupabaseServerClient, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const emailColumn = await pickFirstWorkingColumn(supabase, "profiles", ["email"]);
  if (!emailColumn) {
    return new Map();
  }

  const { data, error } = await supabase.from("profiles").select(`id, ${emailColumn}`).in("id", userIds);
  if (error || !data) {
    return new Map();
  }

  const entries = (data as Array<Record<string, unknown>>)
    .map((row) => [String(row.id), String(row[emailColumn] ?? "")] as const)
    .filter(([, label]) => label.length > 0)
    .map(([id, label]) => [id, truncateText(label, 64)] as const);

  return new Map(entries);
}

export default async function AdminDashboardPage() {
  await requireSuperadmin();

  const supabase = await createSupabaseServerClient();
  const stats = await getDashboardStats(supabase);

  const imageIdsToResolve = Array.from(
    new Set(
      [
        ...stats.topImages.map((item) => item.id),
        ...stats.recentCaptions.map((caption) => caption.imageId),
      ].filter((id) => id !== "-"),
    ),
  );

  const userIdsToResolve = Array.from(
    new Set(
      [
        ...stats.topUsers.map((item) => item.id),
        ...stats.recentCaptions.map((caption) => caption.userId),
      ].filter((id) => id !== "-"),
    ),
  );

  const [imageLabelMap, userLabelMap, userEmailMap] = await Promise.all([
    buildImageLabelMap(supabase, imageIdsToResolve),
    buildUserLabelMap(supabase, userIdsToResolve),
    buildUserEmailMap(supabase, userIdsToResolve),
  ]);

  const activitySectionTitle = stats.hasCreatedColumn ? "Recent Activity" : "Caption Highlights";
  const noActivityText = stats.hasCreatedColumn ? "No recent captions available." : "No caption highlights available.";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">Snapshot of your staging Supabase data.</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Overview</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Total Profiles</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatCount(stats.totalProfiles)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Total Images</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatCount(stats.totalImages)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Total Captions</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatCount(stats.totalCaptions)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Avg Captions / Image</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.averageCaptionsPerImage}</p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Top Images by Captions</h2>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {stats.topImages.length === 0 ? (
            <p className="text-sm text-zinc-500">No caption activity found.</p>
          ) : (
            <div className="space-y-3">
              {stats.topImages.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{imageLabelMap.get(item.id) ?? `Image ${item.id}`}</p>
                  <p className="mt-1 text-xs text-zinc-600">{item.count.toLocaleString()} captions</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Most Active Users</h2>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {stats.topUsers.length === 0 ? (
            <p className="text-sm text-zinc-500">No user activity found.</p>
          ) : (
            <div className="space-y-3">
              {stats.topUsers.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{userLabelMap.get(item.id) ?? `User ${item.id}`}</p>
                  <p className="mt-1 text-xs text-zinc-600">{item.count.toLocaleString()} captions</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">{activitySectionTitle}</h2>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {stats.recentCaptions.length === 0 ? (
            <p className="text-sm text-zinc-500">{noActivityText}</p>
          ) : (
            <div className="space-y-3">
              {stats.recentCaptions.map((caption) => (
                <div key={caption.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{caption.caption}</p>
                  <p className="mt-1 text-xs text-zinc-500">{userEmailMap.get(caption.userId) ?? `User ${caption.userId}`}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-600">Image linked</span>
                    <span className="max-w-full break-all text-zinc-500">
                      {imageLabelMap.get(caption.imageId) ? truncateText(imageLabelMap.get(caption.imageId) as string, 48) : `Image ${caption.imageId}`}
                    </span>
                    {stats.hasCreatedColumn && caption.createdAt ? <span>{caption.createdAt}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">Highlights</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Average Captions Per Image</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">{stats.averageCaptionsPerImage}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Longest Caption Summary</p>
            <p className="mt-2 text-sm text-zinc-900">{stats.longestCaptionSummary}</p>
            <p className="mt-2 text-xs text-zinc-600">{stats.longestCaptionLength.toLocaleString()} characters</p>
          </div>
        </div>
      </section>
    </div>
  );
}
