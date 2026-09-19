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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher, fmtNum } from "@/lib/client";
import { TrendChart, PositionChart, Donut } from "../charts";
import { EmptyState } from "../bits";

const RANGES = [
  { v: "7", l: "7 Days" },
  { v: "30", l: "30 Days" },
  { v: "90", l: "90 Days" },
  { v: "180", l: "6 Months" },
  { v: "365", l: "1 Year" },
];

export default function AnalyticsView({ initialTab }) {
  const [range, setRange] = useState("30");
  const [tab, setTab] = useState(initialTab || "overview");
  const { data, error } = useSWR("/api/analytics?range=" + range, fetcher);

  if (error)
    return (
      <EmptyState
        icon={BarChart3}
        title="Something went wrong"
        description="Unable to load analytics."
        onRetry={() => location.reload()}
      />
    );
  if (!data)
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );

  const t = data.totals,
    d = data.deltas;
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
          </TabsList>
        </Tabs>
      </div>

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
    </div>
  );
}
