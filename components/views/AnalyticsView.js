"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  TrendingUp,
  Eye,
  Users,
  Clock,
  MousePointerClick,
  Target,
  Hash,
  Gauge,
  BarChart3,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Search,
  Image as ImageIcon,
  FileText,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher, fmtNum, fmtDate } from "@/lib/client";
import { TrendChart, PositionChart, Donut } from "../charts";
import { EmptyState } from "../bits";

const RANGES = [
  { v: "7", l: "7 Days" },
  { v: "30", l: "30 Days" },
  { v: "90", l: "90 Days" },
  { v: "180", l: "6 Months" },
  { v: "365", l: "1 Year" },
];

export default function AnalyticsView({ initialTab, navigate }) {
  const [range, setRange] = useState("30");
  const [tab, setTab] = useState(initialTab || "overview");
  const [indexSearch, setIndexSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState("all");
  const { data, error } = useSWR("/api/analytics?range=" + range, fetcher);
  const { data: indexData, isLoading: indexLoading } = useSWR(
    "/api/indexing",
    fetcher,
  );

  if (error || data?.error)
    return (
      <EmptyState
        icon={BarChart3}
        title="Something went wrong"
        description={data?.error || "Unable to load analytics."}
        onRetry={() => location.reload()}
      />
    );
  if (!data || !data.totals)
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );

  const t = data.totals || {},
    d = data.deltas || {};
  const cards = [
    {
      label: "Organic Traffic",
      value: fmtNum(t.organic),
      delta: d.organic,
      icon: TrendingUp,
      color: "text-violet-600",
    },
    {
      label: "Page Views",
      value: fmtNum(t.views),
      delta: d.views,
      icon: Eye,
      color: "text-sky-600",
    },
    {
      label: "Unique Visitors",
      value: fmtNum(t.unique),
      delta: d.views,
      icon: Users,
      color: "text-indigo-600",
    },
    {
      label: "Avg Engagement",
      value: Math.round(t.engagement / 60) + "m",
      delta: d.engagement,
      icon: Clock,
      color: "text-emerald-600",
    },
    {
      label: "Conversions",
      value: fmtNum(t.conversions),
      delta: d.conversions,
      icon: Target,
      color: "text-amber-600",
    },
    {
      label: "CTR",
      value: data.ctr + "%",
      delta: d.ctr,
      icon: MousePointerClick,
      color: "text-rose-600",
    },
    {
      label: "Impressions",
      value: fmtNum(t.impressions),
      delta: d.impressions,
      icon: Hash,
      color: "text-fuchsia-600",
    },
    {
      label: "Avg Position",
      value: t.avgPosition,
      delta: d.avgPosition,
      icon: Gauge,
      color: "text-teal-600",
      invert: true,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Content performance across the last {range} days.
          </p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="traffic" className="text-xs px-3">
              Traffic
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs px-3">
              Search
            </TabsTrigger>
            <TabsTrigger value="indexing" className="text-xs px-3 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-violet-500" />
              Google Indexing
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab !== "indexing" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Date range
          </span>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[130px] h-8 bg-muted/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.v} value={r.v}>
                  {r.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {tab !== "indexing" && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <c.icon className={"h-4 w-4 " + c.color} />
                  <span
                    className={
                      "text-[11px] font-bold " +
                      ((c.invert ? c.delta < 0 : c.delta >= 0)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400")
                    }
                  >
                    {c.delta >= 0 ? "+" : ""}
                    {c.delta}%
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums mt-2">{c.value}</p>
                <p className="text-[11.5px] text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(tab === "overview" || tab === "traffic") && (
        <>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px]">Traffic over time</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.series}
                height={280}
                series={[
                  { key: "organic", label: "Organic", color: "#7c3aed" },
                  { key: "views", label: "Page views", color: "#0ea5e9" },
                  {
                    key: "conversions",
                    label: "Conversions",
                    color: "#f59e0b",
                  },
                ]}
              />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">Traffic by device</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <Donut
                  size={130}
                  thickness={15}
                  data={data.devices.map((dv, i) => ({
                    name: dv.name,
                    value: dv.value,
                    color: ["#7c3aed", "#10b981", "#f59e0b"][i],
                  }))}
                  center={fmtNum(t.organic)}
                  sub="organic"
                />
                <div className="space-y-2 flex-1">
                  {data.devices.map((dv, i) => (
                    <div
                      key={dv.name}
                      className="flex items-center gap-2 text-[12.5px]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{
                          background: ["#7c3aed", "#10b981", "#f59e0b"][i],
                        }}
                      />
                      <span className="flex-1">{dv.name}</span>
                      <span className="font-semibold tabular-nums">
                        {dv.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">
                  Traffic by country
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.countries.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-[12.5px] mb-1">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {fmtNum(c.value)} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: c.pct * 2.8 + "%" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {(tab === "overview" || tab === "search") && (
        <>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px]">
                Average keyword position
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lower is better — positions are improving steadily
              </p>
            </CardHeader>
            <CardContent>
              <PositionChart data={data.series} height={230} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="card-hover overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">Top landing pages</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 text-[11px] uppercase text-muted-foreground">
                      <th className="text-left font-semibold px-4 py-2">
                        Page
                      </th>
                      <th className="text-right font-semibold px-3 py-2">
                        Views
                      </th>
                      <th className="text-right font-semibold px-3 py-2">
                        Organic
                      </th>
                      <th className="text-right font-semibold px-4 py-2">
                        CTR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium truncate max-w-[280px]">
                          {p.title}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {fmtNum(p.views)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {fmtNum(p.organic)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {p.ctr}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="card-hover overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px]">Top keywords</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 text-[11px] uppercase text-muted-foreground">
                      <th className="text-left font-semibold px-4 py-2">
                        Keyword
                      </th>
                      <th className="text-right font-semibold px-3 py-2">
                        Position
                      </th>
                      <th className="text-right font-semibold px-3 py-2">
                        Volume
                      </th>
                      <th className="text-right font-semibold px-4 py-2">
                        Clicks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topKeywords.map((k) => (
                      <tr
                        key={k.keyword}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">
                          {k.keyword}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold">
                          #{k.position}{" "}
                          <span
                            className={
                              "text-[10px] font-semibold " +
                              (k.position <= k.previousPosition
                                ? "text-emerald-600"
                                : "text-rose-600")
                            }
                          >
                            {k.position <= k.previousPosition ? "▲" : "▼"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {fmtNum(k.volume)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtNum(k.clicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Google Indexing Tab */}
      {tab === "indexing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="card-hover border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Google Indexed
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-800 dark:text-emerald-200">
                  {indexLoading ? "…" : `${indexData?.summary?.indexed || 0} / ${indexData?.summary?.total || 0}`}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  {indexLoading
                    ? "Checking Google Search Console…"
                    : `${indexData?.summary?.rate || 0}% of published blogs are indexed`}
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Pending Crawl
                  </span>
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-2xl font-bold tabular-nums mt-1 text-amber-800 dark:text-amber-200">
                  {indexLoading ? "…" : indexData?.summary?.pending || 0}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Awaiting Google bot discovery & index
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Search Console Property
                  </span>
                  <Globe className="h-4 w-4 text-violet-500" />
                </div>
                <p className="text-sm font-semibold truncate mt-2 font-mono">
                  {indexData?.summary?.siteUrl || "Connected via GSC"}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> API Connected (Service Account)
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-hover overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <CardTitle className="text-[15px]">
                    Published Blogs Index Status
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verified via Google Search Console API (90d)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search blogs…"
                      value={indexSearch}
                      onChange={(e) => setIndexSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-muted/40"
                    />
                    {indexSearch && (
                      <button
                        onClick={() => setIndexSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Select value={indexFilter} onValueChange={setIndexFilter}>
                    <SelectTrigger className="w-[150px] h-8 text-xs bg-muted/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="indexed">
                        Indexed ({indexData?.summary?.indexed || 0})
                      </SelectItem>
                      <SelectItem value="pending">
                        Pending ({indexData?.summary?.pending || 0})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {(indexSearch || indexFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setIndexSearch("");
                        setIndexFilter("all");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {indexLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : (indexData?.items || []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No published blogs found. Publish blogs to see their Google indexing status.
                </div>
              ) : (() => {
                const filtered = (indexData?.items || []).filter((item) => {
                  if (indexFilter === "indexed" && !item.isIndexed) return false;
                  if (indexFilter === "pending" && item.isIndexed) return false;
                  if (indexSearch.trim()) {
                    const q = indexSearch.toLowerCase();
                    return (
                      item.title?.toLowerCase().includes(q) ||
                      item.slug?.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No blogs match your filter criteria.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground">
                          <th className="text-left font-semibold px-4 py-2.5">
                            Blog
                          </th>
                          <th className="text-left font-semibold px-3 py-2.5">
                            Published
                          </th>
                          <th className="text-left font-semibold px-3 py-2.5">
                            Index Status
                          </th>
                          <th className="text-right font-semibold px-3 py-2.5">
                            Impressions
                          </th>
                          <th className="text-right font-semibold px-3 py-2.5">
                            Clicks
                          </th>
                          <th className="text-right font-semibold px-4 py-2.5">
                            Avg Position
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filtered.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-accent/40 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {item.featuredImage ? (
                                  <img
                                    src={item.featuredImage}
                                    alt={item.title}
                                    className="w-10 h-10 rounded-lg object-cover border border-border shrink-0 shadow-xs"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border shrink-0 text-muted-foreground">
                                    <ImageIcon className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0 max-w-[260px] sm:max-w-[320px]">
                                  <p
                                    onClick={() =>
                                      navigate?.("blog", { id: item.id })
                                    }
                                    className="font-medium text-[13px] truncate text-foreground hover:text-primary transition-colors cursor-pointer"
                                    title={item.title}
                                  >
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate font-mono">
                                    /blogs/{item.slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                              {fmtDate(item.publishedAt)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {item.isIndexed ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 font-medium text-[11px]"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  Indexed
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1 font-medium text-[11px]"
                                >
                                  <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                  Pending Crawl
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold">
                              {item.impressions > 0
                                ? fmtNum(item.impressions)
                                : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {item.clicks > 0 ? fmtNum(item.clicks) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {item.position > 0 ? `#${item.position}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
