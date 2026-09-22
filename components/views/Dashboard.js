"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  FileText,
  Globe,
  FileEdit,
  CalendarClock,
  TrendingUp,
  Gauge,
  KeyRound,
  Eye,
  MousePointerClick,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  Users2,
  Activity as ActivityIcon,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle2,
  CalendarClock as SchedIcon,
  PenLine,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api, fetcher, fmtNum, fmtDate, timeAgo, initials } from "@/lib/client";
import {
  StatCard,
  StatusBadge,
  ScoreRing,
  EmptyState,
  SkeletonCards,
  SkeletonTable,
  ConfirmDialog,
} from "../bits";
import { TrendChart, BarsChart, Donut } from "../charts";

const RANGES = [
  { v: "7", l: "7 Days" },
  { v: "30", l: "30 Days" },
  { v: "90", l: "90 Days" },
  { v: "180", l: "6 Months" },
  { v: "365", l: "1 Year" },
];
const METRICS = [
  { key: "organic", label: "Organic visitors", color: "#7c3aed" },
  { key: "views", label: "Page views", color: "#0ea5e9" },
  { key: "engagement", label: "Avg engagement", color: "#10b981" },
  { key: "conversions", label: "Conversions", color: "#f59e0b" },
];
const ACT_ICON = {
  published: Globe,
  created: PenLine,
  uploaded: ImageIcon,
  changed_status: RefreshCw,
  updated: Pencil,
  approved: CheckCircle2,
  deleted: Trash2,
  scheduled: SchedIcon,
  duplicated: Copy,
  archived: Archive,
  resolved: CheckCircle2,
  invited: Users2,
  imported: Plus,
  removed: Trash2,
};

export default function Dashboard({ user, navigate, can }) {
  const [range, setRange] = useState("30");
  const [metrics, setMetrics] = useState(["organic", "views"]);
  const [confirm, setConfirm] = useState(null);

  const { data: stats, error: statsErr } = useSWR("/api/stats", fetcher);
  const { data: analytics } = useSWR("/api/analytics?range=" + range, fetcher);
  const { data: top } = useSWR(
    "/api/blogs?sort=views&limit=6&status=all",
    fetcher,
  );
  const { data: activity } = useSWR("/api/activity", fetcher);
  const { data: issues } = useSWR("/api/seo-issues", fetcher);

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "").split(" ")[0];

  const k = stats?.kpis || {};
  const spark = stats?.spark || {};
  const series = analytics?.series || [];

  const toggleMetric = (key) => {
    setMetrics((m) =>
      m.includes(key)
        ? m.length > 1
          ? m.filter((x) => x !== key)
          : m
        : [...m, key],
    );
  };

  const pubBuckets = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        key: d.getFullYear() + "-" + d.getMonth(),
        label: d.toLocaleString("en", { month: "short" }),
        published: 0,
        drafted: 0,
        updated: 0,
      });
    }
    const map = {};
    months.forEach((m) => {
      map[m.key] = m;
    });
    (top?.items || []).forEach((b) => {
      if (b.publishedAt) {
        const d = new Date(b.publishedAt);
        const m = map[d.getFullYear() + "-" + d.getMonth()];
        if (m) m.published++;
      }
      if (b.createdAt) {
        const d = new Date(b.createdAt);
        const m = map[d.getFullYear() + "-" + d.getMonth()];
        if (m) m.drafted++;
      }
      if (b.status === "published" && b.updatedAt) {
        const d = new Date(b.updatedAt);
        const m = map[d.getFullYear() + "-" + d.getMonth()];
        if (m) m.updated++;
      }
    });
    return months;
  })();

  const blogActions = (b) => [
    { label: "View", icon: Eye, onClick: () => navigate("blog", { id: b.id }) },
    {
      label: "Edit",
      icon: Pencil,
      onClick: () => navigate("editor", { id: b.id }),
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: () =>
        api("/blogs/" + b.id + "/duplicate", { method: "POST" }).then(() =>
          window.dispatchEvent(new Event("ss-refresh")),
        ),
    },
    {
      label: "Archive",
      icon: Archive,
      onClick: () =>
        api("/blogs/" + b.id + "/transition", {
          method: "POST",
          body: { to: "archived" },
        }).then(() => window.dispatchEvent(new Event("ss-refresh"))),
    },
    {
      label: "Delete",
      icon: Trash2,
      danger: true,
      onClick: () => setConfirm({ id: b.id, title: b.title }),
    },
  ];

  if (statsErr)
    return (
      <EmptyState
        icon={TrendingUp}
        title="Something went wrong"
        description="Unable to load your dashboard. Please try again."
        action={<Button onClick={() => location.reload()}>Retry</Button>}
      />
    );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">
            {greet}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your content today.
          </p>
        </div>
        {can("blogs.create") && (
          <Button
            onClick={() => navigate("editor", { id: null })}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 h-10"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Blog
          </Button>
        )}
      </div>

      {/* KPIs */}
      {!stats ? (
        <SkeletonCards n={8} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Blogs"
            value={k.totalBlogs?.value || 0}
            delta={k.totalBlogs?.delta || 0}
            icon={FileText}
            iconBg="bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
            spark={spark.traffic}
          />
          <StatCard
            label="Published Blogs"
            value={k.published?.value || 0}
            delta={k.published?.delta || 0}
            icon={Globe}
            iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
            spark={spark.views}
            sparkColor="#10b981"
          />
          <StatCard
            label="Drafts"
            value={k.drafts?.value || 0}
            delta={k.drafts?.delta || 0}
            icon={FileEdit}
            iconBg="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
            spark={spark.engagement}
            sparkColor="#f59e0b"
          />
          <StatCard
            label="Scheduled"
            value={k.scheduled?.value || 0}
            delta={k.scheduled?.delta || 0}
            icon={CalendarClock}
            iconBg="bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"
            spark={spark.engagement}
            sparkColor="#0ea5e9"
          />
          <StatCard
            label="Organic Traffic"
            value={fmtNum(k.organicTraffic?.value || 0)}
            delta={k.organicTraffic?.delta || 0}
            icon={TrendingUp}
            iconBg="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
            spark={spark.traffic}
            sparkColor="#6366f1"
          />
          <StatCard
            label="Average SEO Score"
            value={(k.seoScore?.value || 0) + "/100"}
            delta={k.seoScore?.delta || 0}
            icon={Gauge}
            iconBg="bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
            spark={spark.score}
            sparkColor="#f43f5e"
          />
          <StatCard
            label="Keywords Ranking"
            value={k.keywordsRanking?.value || 0}
            delta={k.keywordsRanking?.delta || 0}
            icon={KeyRound}
            iconBg="bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300"
            spark={spark.keywords}
            sparkColor="#14b8a6"
          />
          <StatCard
            label="Total Views"
            value={fmtNum(k.totalViews?.value || 0)}
            delta={k.totalViews?.delta || 0}
            icon={Eye}
            iconBg="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-300"
            spark={spark.views}
            sparkColor="#d946ef"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 card-hover">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-[15px] font-semibold">
                Organic Traffic
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visitor performance across your published content
              </p>
            </div>
            <Tabs value={range} onValueChange={setRange}>
              <TabsList className="h-8 max-w-full overflow-x-auto">
                {RANGES.map((r) => (
                  <TabsTrigger
                    key={r.v}
                    value={r.v}
                    className="text-xs px-2.5 h-7"
                  >
                    {r.l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all " +
                    (metrics.includes(m.key)
                      ? "border-transparent text-white shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent")
                  }
                  style={metrics.includes(m.key) ? { background: m.color } : {}}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  {m.label}
                </button>
              ))}
            </div>
            <TrendChart
              data={series}
              series={METRICS.filter((m) => metrics.includes(m.key)).map(
                (m) => ({ key: m.key, label: m.label, color: m.color }),
              )}
              height={264}
            />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">
              Content Publishing Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Blogs published, drafted and updated
            </p>
          </CardHeader>
          <CardContent>
            <BarsChart
              data={pubBuckets}
              xKey="label"
              bars={[
                { key: "published", label: "Published", color: "#10b981" },
                { key: "drafted", label: "Drafted", color: "#7c3aed" },
                { key: "updated", label: "Updated", color: "#f59e0b" },
              ]}
              height={252}
            />
            <div className="flex items-center justify-center gap-4 mt-1">
              {[
                ["Published", "#10b981"],
                ["Drafted", "#7c3aed"],
                ["Updated", "#f59e0b"],
              ].map(([l, c]) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: c }}
                  />
                  {l}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top blogs + SEO health + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 card-hover overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-[15px] font-semibold">
                Top Performing Blogs
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your strongest organic performers this period
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs"
              onClick={() => navigate("blogs", {})}
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          {!top ? (
            <SkeletonTable rows={5} />
          ) : (top.items || []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No blogs yet"
              description="Create your first optimized article and start building organic traffic."
              action={
                can("blogs.create") && (
                  <Button onClick={() => navigate("editor", { id: null })}>
                    Create Blog
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-semibold px-4 py-2.5">
                      Blog
                    </th>
                    <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">
                      Category
                    </th>
                    <th className="text-right font-semibold px-3 py-2.5">
                      Views
                    </th>
                    <th className="text-right font-semibold px-3 py-2.5 hidden sm:table-cell">
                      Organic
                    </th>
                    <th className="text-center font-semibold px-3 py-2.5">
                      SEO
                    </th>
                    <th className="text-left font-semibold px-3 py-2.5">
                      Status
                    </th>
                    <th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {(top.items || []).map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <button
                          className="flex items-center gap-3 text-left"
                          onClick={() => navigate("blog", { id: b.id })}
                        >
                          {b.featuredImage?.url ? (
                            <img
                              src={b.featuredImage.url}
                              alt=""
                              className="h-10 w-14 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-muted border border-border" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[240px] group-hover:text-primary transition-colors">
                              {b.title}
                            </p>
                            <p className="text-[11.5px] text-muted-foreground">
                              {b.author} ·{" "}
                              {b.status === "published"
                                ? fmtDate(b.publishedAt || b.createdAt)
                                : b.status === "scheduled"
                                  ? "Scheduled " + fmtDate(b.scheduledAt)
                                  : "Draft · Edited " +
                                    timeAgo(b.updatedAt || b.createdAt)}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal"
                        >
                          {b.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {fmtNum(b.analytics?.views)}
                      </td>
                      <td className="px-3 py-3 text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                        {fmtNum(b.analytics?.organic)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ScoreRing
                          value={b.seo?.score || 0}
                          size={38}
                          thickness={4.5}
                          showLabel={false}
                        />
                        <span className="sr-only">{b.seo?.score}</span>
                        <span className="sr-only">
                          SEO score {b.seo?.score}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-2 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {blogActions(b)
                              .map((a, i) => (
                                <DropdownMenuItem
                                  key={i}
                                  onClick={a.onClick}
                                  className={
                                    a.danger
                                      ? "text-rose-600 dark:text-rose-400"
                                      : ""
                                  }
                                >
                                  <a.icon className="h-4 w-4 mr-2" />
                                  {a.label}
                                </DropdownMenuItem>
                              ))
                              .flatMap((x, i) =>
                                i === 2
                                  ? [x, <DropdownMenuSeparator key={"s" + i} />]
                                  : [x],
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="card-hover">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[15px] font-semibold">
                SEO Health
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => navigate("seo-overview", {})}
              >
                Details
              </Button>
            </CardHeader>
            <CardContent className="flex items-center gap-5">
              <Donut
                size={120}
                thickness={13}
                center={stats ? k.seoScore?.value : "—"}
                sub="avg score"
                data={[
                  {
                    name: "Good",
                    value: stats ? Math.max(k.seoScore?.value, 1) : 1,
                    color: "#10b981",
                  },
                  {
                    name: "To improve",
                    value: stats ? 100 - k.seoScore?.value : 1,
                    color: "#f1f0f5",
                  },
                ]}
              />
              <div className="flex-1 space-y-2.5">
                <button
                  onClick={() => navigate("issues", {})}
                  className="w-full flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30 px-3 py-2 hover:border-rose-200 transition-colors"
                >
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                    Critical issues
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-300">
                    {issues?.summary?.critical ?? "—"}
                  </span>
                </button>
                <button
                  onClick={() => navigate("issues", {})}
                  className="w-full flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2 hover:border-amber-200 transition-colors"
                >
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Warnings
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-300">
                    {issues?.summary?.warnings ?? "—"}
                  </span>
                </button>
                <button
                  onClick={() => navigate("issues", {})}
                  className="w-full flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-2 hover:border-emerald-200 transition-colors"
                >
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Passed audits
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                    {issues?.summary?.passed ?? "—"}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[15px] font-semibold">
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => navigate("activity", {})}
              >
                All logs
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(activity?.items || []).slice(0, 6).map((a) => {
                const Icon = ACT_ICON[a.action] || ActivityIcon;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <span className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] leading-snug">
                        <span className="font-semibold">{a.user}</span>{" "}
                        {a.action.replace(/_/g, " ")}{" "}
                        <span className="text-muted-foreground">
                          “{a.resource}”
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!activity &&
                [1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this blog?"
        description={
          "“" +
          (confirm?.title || "") +
          "” will be permanently removed. This action cannot be undone."
        }
        onConfirm={() => {
          api("/blogs/" + confirm.id, { method: "DELETE" }).then(() => {
            window.dispatchEvent(new Event("ss-refresh"));
          });
          setConfirm(null);
        }}
      />
    </div>
  );
}
