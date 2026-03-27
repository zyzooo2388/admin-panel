"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type Props = {
  countCards: CountCard[];
  captionsByFlavor: FlavorCountPoint[];
  dailyVolume: DailyPoint[];
};

type ActivityItem = {
  id: string;
  name: string;
  action: string;
  meta: string;
  time: string;
  avatar: string;
  tone: string;
};

type UpdateItem = {
  id: string;
  name: string;
  action: string;
  time: string;
  avatar: string;
  tone: string;
};

function formatCount(value: number | null): string {
  if (value === null) {
    return "Unavailable";
  }

  return value.toLocaleString("en-US");
}

const KPI_STYLES: Record<
  string,
  {
    icon: ReactNode;
    chip: string;
    glow: string;
  }
> = {
  "Total Users": {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M16 18.5a4 4 0 0 0-8 0M14 8a2 2 0 1 1-4 0a2 2 0 0 1 4 0Zm8 10.5a4 4 0 0 0-5.2-3.82M18.8 8.2a2 2 0 1 1-1.8 2.78M2 18.5a4 4 0 0 1 5.2-3.82M5.2 8.2A2 2 0 1 0 7 10.98"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chip: "from-indigo-100 via-violet-100 to-fuchsia-100 text-indigo-700",
    glow: "from-indigo-300/30",
  },
  "Total Images": {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2.5 9.5 3.5-3.5 2.5 2.5 2.5-3 2.5 4M9 9h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chip: "from-fuchsia-100 via-rose-100 to-indigo-100 text-fuchsia-700",
    glow: "from-fuchsia-300/25",
  },
  "Total Humor Flavors": {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M8.5 14a3.5 3.5 0 0 0 7 0M8 9.5h.01M16 9.5h.01M12 3.5c4.7 0 8.5 3.58 8.5 8s-3.8 8-8.5 8-8.5-3.58-8.5-8 3.8-8 8.5-8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chip: "from-violet-100 via-purple-100 to-indigo-100 text-violet-700",
    glow: "from-violet-300/25",
  },
  "Total Captions": {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="m12 3.2 1.7 4.4 4.4 1.7-4.4 1.7-1.7 4.4-1.7-4.4-4.4-1.7 4.4-1.7L12 3.2Zm6.4 10.6.92 2.38 2.38.92-2.38.92-.92 2.38-.92-2.38-2.38-.92 2.38-.92.92-2.38Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chip: "from-amber-100 via-yellow-100 to-orange-100 text-amber-700",
    glow: "from-amber-300/25",
  },
  "Total Caption Requests": {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M5 18.5 19 12 5 5.5l2.8 5.2L19 12l-11.2 1.3L5 18.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    chip: "from-cyan-100 via-sky-100 to-indigo-100 text-cyan-700",
    glow: "from-cyan-300/25",
  },
};

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: "activity-1",
    name: "Nora Ellis",
    action: "reviewed premium caption outputs for the latest image batch",
    meta: "Humor style card refreshed · Editorial queue",
    time: "5 min ago",
    avatar: "N",
    tone: "from-indigo-500 to-violet-500",
  },
  {
    id: "activity-2",
    name: "Mika Chen",
    action: "organized fresh uploads into the studio image folder",
    meta: "Folder badge · 12 assets grouped",
    time: "18 min ago",
    avatar: "M",
    tone: "from-fuchsia-500 to-violet-500",
  },
  {
    id: "activity-3",
    name: "Avery Stone",
    action: "adjusted humor flavor ordering for smoother caption variety",
    meta: "Prompt blend update · Soft launch",
    time: "42 min ago",
    avatar: "A",
    tone: "from-emerald-500 to-cyan-500",
  },
];

const UPDATE_ITEMS: UpdateItem[] = [
  {
    id: "update-1",
    name: "Lena",
    action: "published a tiny dashboard polish pass",
    time: "11 min ago",
    avatar: "L",
    tone: "from-indigo-500 to-violet-500",
  },
  {
    id: "update-2",
    name: "Marco",
    action: "queued a new image moderation review",
    time: "29 min ago",
    avatar: "M",
    tone: "from-fuchsia-500 to-rose-500",
  },
  {
    id: "update-3",
    name: "Jules",
    action: "logged a caption request throughput note",
    time: "54 min ago",
    avatar: "J",
    tone: "from-cyan-500 to-indigo-500",
  },
];

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-[1.75rem] border border-dashed border-violet-200/80 bg-white/55 text-sm text-slate-500 backdrop-blur-sm">
      {message}
    </div>
  );
}

function DashboardMetricCard({ card }: { card: CountCard }) {
  const style = KPI_STYLES[card.label] ?? KPI_STYLES["Total Humor Flavors"];

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-violet-100/80 bg-white/82 px-5 py-5 shadow-[0_1px_2px_rgba(30,41,59,0.04),0_18px_38px_rgba(109,40,217,0.12)] backdrop-blur-sm">
      <div className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${style.glow} to-transparent blur-xl`} />
      <div className="relative z-10 flex items-start gap-4">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.chip} shadow-[0_10px_24px_rgba(109,40,217,0.18)]`}
        >
          {style.icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
          <p className="mt-2 text-[1.85rem] font-semibold leading-none tracking-tight text-slate-900">{formatCount(card.value)}</p>
          {card.hint ? <p className="mt-2 text-xs text-slate-500">{card.hint}</p> : null}
        </div>
      </div>
    </article>
  );
}

function DashboardChartCard({
  title,
  description,
  icon,
  children,
  sparkleClassName,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  sparkleClassName: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-white/82 p-6 shadow-[0_1px_2px_rgba(30,41,59,0.04),0_18px_38px_rgba(109,40,217,0.12)] backdrop-blur-sm">
      <div className={`pointer-events-none absolute right-6 top-5 ${sparkleClassName}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
          <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
        </svg>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
              {icon}
            </span>
            {title}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export default function DashboardChartsClient({ countCards, captionsByFlavor, dailyVolume }: Props) {
  const hasVolumeData = dailyVolume.length > 0;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-gradient-to-br from-[#fbf9ff] via-[#f5f2ff] to-[#eff1ff] p-5 shadow-[0_24px_70px_rgba(79,70,229,0.12)] sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute -left-20 top-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(196,181,253,0.3),_transparent_70%)] blur-xl" />
      <div className="pointer-events-none absolute -right-20 -top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(167,139,250,0.28),_transparent_66%)] blur-2xl" />
      <div className="pointer-events-none absolute right-8 top-10 h-44 w-72 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.55),_rgba(255,255,255,0)_75%)] blur-xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(167,243,208,0.16),_transparent_70%)] blur-xl" />

      <span className="pointer-events-none absolute left-[13%] top-[15%] text-violet-300/60">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5 fill-current">
          <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
        </svg>
      </span>
      <span className="pointer-events-none absolute right-[18%] top-[22%] text-indigo-300/55">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5 fill-current">
          <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
        </svg>
      </span>
      <span className="pointer-events-none absolute right-[10%] top-[30%] text-fuchsia-300/45">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2 w-2 fill-current">
          <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
        </svg>
      </span>

      <div className="relative z-10 space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 shadow-[0_8px_20px_rgba(139,92,246,0.12)] backdrop-blur">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                  <path
                    d="m12 2.8 1.66 3.6 3.95.57-2.86 2.8.67 3.95L12 11.94l-3.42 1.78.67-3.95-2.86-2.8 3.95-.57L12 2.8Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Command Center
            </div>
            <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight text-slate-900 lg:text-[2.05rem]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_20px_rgba(79,70,229,0.35)]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path
                    d="M12 3 6 6v5c0 4.62 2.66 8.95 6 10 3.34-1.05 6-5.38 6-10V6l-6-3Zm0 4.2 2.6 1.2.58 2.84-1.8 2.2L12 15l-1.38-1.56-1.8-2.2.58-2.84L12 7.2Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Dashboard
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Operational snapshot for users, media, humor flavors, and caption pipeline activity.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/75 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[0_10px_20px_rgba(109,40,217,0.12)] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(74,222,128,0.18)]" />
            <span className="font-semibold text-violet-700">v2.1.0</span>
            <span>Live status</span>
          </div>
        </header>

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {countCards.map((card) => (
              <DashboardMetricCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <DashboardChartCard
            title="Captions by Humor Flavor"
            description="Top humor flavors based on current caption records."
            sparkleClassName="text-violet-300/60"
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path
                  d="M5 19V9m7 10V5m7 14v-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            {captionsByFlavor.length === 0 ? (
              <EmptyChartState message="No caption flavor data available." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={captionsByFlavor} margin={{ top: 8, right: 16, left: 0, bottom: 36 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="#e8e7fb" />
                    <XAxis
                      dataKey="flavor"
                      angle={-25}
                      interval={0}
                      textAnchor="end"
                      height={56}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip
                      cursor={{ fill: "#ede9fe80" }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #ddd6fe",
                        backgroundColor: "rgba(255,255,255,0.96)",
                        boxShadow: "0 14px 30px rgba(79, 70, 229, 0.15)",
                        color: "#1e1b4b",
                      }}
                    />
                    <Bar dataKey="count" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashboardChartCard>

          <DashboardChartCard
            title="Requests and Images Over Time"
            description="Daily UTC volume from current request and image records."
            sparkleClassName="text-indigo-300/60"
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path
                  d="M4 14.5 8 10l3 3 5-6 4 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            {!hasVolumeData ? (
              <EmptyChartState message="No timestamped records found for this chart." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyVolume} margin={{ top: 8, right: 16, left: 0, bottom: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="#e8e7fb" />
                    <XAxis
                      dataKey="label"
                      type="category"
                      allowDuplicatedCategory={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #ddd6fe",
                        backgroundColor: "rgba(255,255,255,0.96)",
                        boxShadow: "0 14px 30px rgba(79, 70, 229, 0.15)",
                        color: "#1e1b4b",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#475569", fontSize: "12px" }} />
                    <Line
                      dataKey="requests"
                      name="Caption requests"
                      stroke="#7c3aed"
                      strokeWidth={2.6}
                      dot={false}
                      activeDot={{ r: 4, fill: "#7c3aed", stroke: "#ffffff", strokeWidth: 1.5 }}
                    />
                    <Line
                      dataKey="images"
                      name="Images"
                      stroke="#34d399"
                      strokeWidth={2.6}
                      dot={false}
                      activeDot={{ r: 4, fill: "#34d399", stroke: "#ffffff", strokeWidth: 1.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashboardChartCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-white/80 p-6 shadow-[0_1px_2px_rgba(30,41,59,0.04),0_18px_38px_rgba(109,40,217,0.1)] backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,_rgba(216,180,254,0.25),_transparent_70%)] blur-xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-violet-100 text-fuchsia-700">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                      <path
                        d="M15 17H5.5a1 1 0 0 1-.8-1.6L6 13.7V10a6 6 0 1 1 12 0v3.7l1.3 1.7a1 1 0 0 1-.8 1.6H18m-3 0a3 3 0 0 1-6 0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Recent Activity
                </h3>
                <p className="mt-1.5 text-xs text-slate-500">Mock UI activity used to complete the dashboard composition.</p>
              </div>
              <div className="rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Humor Style</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Dreamy Wit</p>
                <p className="text-[11px] text-slate-500">Soft spark + premium tone</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {ACTIVITY_ITEMS.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-[1.5rem] border border-violet-100/70 bg-gradient-to-r from-white to-violet-50/60 px-4 py-3.5"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.tone} text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]`}
                  >
                    {item.avatar}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                      <span className="rounded-full border border-violet-200/70 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                        Active
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">{item.action}</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.meta}</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">{item.time}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-white/80 p-6 shadow-[0_1px_2px_rgba(30,41,59,0.04),0_18px_38px_rgba(109,40,217,0.1)] backdrop-blur-sm">
            <div className="pointer-events-none absolute right-5 top-5 text-violet-300/60">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
                <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
              </svg>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                      <path
                        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v6A2.5 2.5 0 0 1 17.5 16H9l-4.5 3V7.5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Latest Updates
                </h3>
                <p className="mt-1.5 text-xs text-slate-500">Compact placeholder feed to match the reference layout.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-violet-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-violet-700 shadow-[0_8px_16px_rgba(109,40,217,0.12)]"
              >
                View all activity
              </button>
            </div>
            <ul className="mt-5 space-y-3">
              {UPDATE_ITEMS.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[1.35rem] border border-violet-100/70 bg-gradient-to-r from-white to-indigo-50/50 px-4 py-3"
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.tone} text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.2)]`}
                  >
                    {item.avatar}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="block text-sm text-slate-600">{item.action}</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">{item.time}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
