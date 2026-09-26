"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Archive,
  Trash2,
  FileText,
  ChevronDown,
  RotateCcw,
  LayoutGrid,
  Clock,
  Send,
  CheckCircle2,
  Rocket,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  fetcher,
  fmtNum,
  fmtDate,
  fmtDateTime,
  timeAgo,
  initials,
  getVinimayBlogUrl,
} from "@/lib/client";
import {
  StatusBadge,
  ScoreRing,
  EmptyState,
  SkeletonTable,
  ConfirmDialog,
  RequestChangesDialog,
  ScheduleDialog,
  Pagination,
} from "../bits";

const TABS = [
  { v: "all", l: "All" },
  { v: "draft", l: "Drafts" },
  { v: "in_review", l: "In Review" },
  { v: "approved", l: "Approved" },
  { v: "scheduled", l: "Scheduled" },
  { v: "published", l: "Published" },
  { v: "archived", l: "Archived" },
];

export default function Blogs({ statusFilter, navigate, can }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(statusFilter || "all");
  const [author, setAuthor] = useState("all");
  const [category, setCategory] = useState("all");
  const [band, setBand] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [requestChangesBlog, setRequestChangesBlog] = useState(null);
  const [scheduleBlog, setScheduleBlog] = useState(null);

  useEffect(() => {
    setStatus(statusFilter || "all");
    setPage(1);
  }, [statusFilter]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "all") p.set("status", status);
    if (author !== "all") p.set("author", author);
    if (category !== "all") p.set("category", category);
    if (band !== "all") p.set("seoBand", band);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return "/api/blogs?" + p.toString();
  }, [q, status, author, category, band, sort, page, limit]);

  const { data, error, mutate } = useSWR(query, fetcher, {
    keepPreviousData: true,
  });
  const { data: team } = useSWR("/api/team", fetcher);
  const { data: contentOptions } = useSWR("/api/content-options", fetcher);

  const categoriesList = useMemo(() => {
    const set = new Set();
    (contentOptions?.categories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    (data?.categories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    (data?.items || []).forEach((b) => {
      if (b.category && b.category.trim()) set.add(b.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contentOptions?.categories, data?.categories, data?.items]);

  const [savedCounts, setSavedCounts] = useState({});
  useEffect(() => {
    if (data?.counts) {
      setSavedCounts((prev) => ({ ...prev, ...data.counts }));
    }
  }, [data?.counts]);

  const items = data?.items || [];
  const counts = data?.counts || savedCounts;

  const refresh = () => {
    mutate();
    window.dispatchEvent(new Event("ss-refresh"));
  };

  const actionsFor = (b) => {
    const isPub = b.status === "published";
    const isSched = b.status === "scheduled";
    const acts = [
      {
        label: "View in Studio",
        icon: Eye,
        show: true,
        onClick: () => navigate("blog", { id: b.id }),
      },
      {
        label: "View on Vinimay",
        icon: ExternalLink,
        show: isPub && !!b.slug,
        onClick: () => window.open(getVinimayBlogUrl(b.slug), "_blank"),
      },
      {
        label: "Edit",
        icon: Pencil,
        show: can("blogs.edit"),
        onClick: () => navigate("editor", { id: b.id }),
      },
      {
        label: "Approve Blog",
        icon: CheckCircle2,
        show: b.status === "in_review" && can("blogs.publish"),
        onClick: () =>
          api("/blogs/" + b.id + "/transition", {
            method: "POST",
            body: { to: "approved" },
          }).then(refresh),
      },
      {
        label: "Request Changes",
        icon: RotateCcw,
        show: b.status === "in_review" && can("blogs.publish"),
        onClick: () => setRequestChangesBlog(b),
      },
      {
        label: "Withdraw to Draft",
        icon: RotateCcw,
        show:
          b.status === "in_review" &&
          can("blogs.edit") &&
          !can("blogs.publish"),
        onClick: () => {
          setConfirmDialog({
            title: "Withdraw blog from review?",
            description: `"${b.title}" will be moved back to Draft so you can continue editing it.`,
            confirmLabel: "Withdraw to Draft",
            destructive: false,
            onConfirm: () =>
              api("/blogs/" + b.id + "/transition", {
                method: "POST",
                body: { to: "draft" },
              }).then(refresh),
          });
        },
      },
      {
        label: b.status === "scheduled" || b.status === "published" ? "Reschedule" : "Schedule",
        icon: CalendarClock,
        show:
          (b.status === "draft" ||
            b.status === "in_review" ||
            b.status === "approved" ||
            b.status === "scheduled" ||
            b.status === "published") &&
          can("blogs.schedule"),
        onClick: () => {
          if (b.status === "draft" || b.status === "in_review") {
            const score = b.seo?.score || 0;
            setConfirmDialog({
              title: `Schedule blog from ${b.status === "draft" ? "Draft" : "Review"}?`,
              description: `"${b.title}" is in ${b.status === "draft" ? "Draft" : "Review"} with an SEO score of ${score}/100. Do you want to proceed to scheduling?`,
              confirmLabel: "Proceed to Schedule",
              destructive: false,
              onConfirm: () => setScheduleBlog(b),
            });
          } else {
            setScheduleBlog(b);
          }
        },
      },
      {
        label: "Publish now",
        icon: Rocket,
        show:
          (b.status === "draft" ||
            b.status === "in_review" ||
            b.status === "approved" ||
            b.status === "scheduled") &&
          can("blogs.publish"),
        onClick: () => {
          const doPublish = () =>
            api("/blogs/" + b.id + "/transition", {
              method: "POST",
              body: { to: "published" },
            }).then(() => {
              refresh();
              toast.success("Blog published successfully 🎉", {
                description: `"${b.title}" is now live on Vinimay.`,
                action: {
                  label: "View on Vinimay ↗",
                  onClick: () => window.open(getVinimayBlogUrl(b.slug), "_blank"),
                },
                duration: 9000,
              });
            });

          if (b.status === "draft" || b.status === "in_review") {
            const score = b.seo?.score || 0;
            setConfirmDialog({
              title: `Publish directly from ${b.status === "draft" ? "Draft" : "Review"}?`,
              description: `"${b.title}" is currently in ${b.status === "draft" ? "Draft" : "Review"} with an SEO score of ${score}/100. Publishing will make it live immediately on Vinimay. Do you want to publish now?`,
              confirmLabel: "Publish Now",
              destructive: false,
              onConfirm: doPublish,
            });
          } else {
            doPublish();
          }
        },
      },
      {
        label: "Submit for Review",
        icon: Send,
        show: can("blogs.edit") && b.status === "draft",
        onClick: () =>
          api("/blogs/" + b.id + "/transition", {
            method: "POST",
            body: { to: "in_review" },
          }).then(refresh),
      },
      {
        label: "Duplicate",
        icon: Copy,
        show: can("blogs.create"),
        onClick: () =>
          api("/blogs/" + b.id + "/duplicate", { method: "POST" }).then(
            refresh,
          ),
      },
      {
        label: "Archive",
        icon: Archive,
        show: b.status !== "archived" && can("blogs.archive"),
        onClick: () => {
          setConfirmDialog({
            title: isPub ? "Archive published blog?" : "Archive this blog?",
            description: isPub
              ? `"${b.title}" is currently live on your website. Archiving will immediately unpublish it and move it to the Archived tab. Are you sure you want to archive it?`
              : `"${b.title}" will be moved out of the active workflow to the Archived tab.`,
            confirmLabel: "Archive Blog",
            destructive: isPub,
            onConfirm: () =>
              api("/blogs/" + b.id + "/transition", {
                method: "POST",
                body: { to: "archived" },
              }).then(refresh),
          });
        },
      },
      {
        label: isPub ? "Unpublish to Draft" : "Move to Draft",
        icon: RotateCcw,
        show: isPub || isSched || b.status === "archived" || b.status === "approved",
        onClick: () => {
          const isAppr = b.status === "approved";
          setConfirmDialog({
            title: isPub
              ? "Unpublish blog to Draft?"
              : isSched
                ? "Cancel schedule and move to Draft?"
                : isAppr
                  ? "Move approved blog back to Draft?"
                  : "Restore to Draft?",
            description: isPub
              ? `"${b.title}" is currently live on your website. Moving it to Draft will immediately unpublish it and remove it from public view. Are you sure you want to unpublish?`
              : isSched
                ? `"${b.title}" is scheduled to be published. Moving it to Draft will cancel the schedule. Do you want to proceed?`
                : isAppr
                  ? `"${b.title}" has been approved for publishing. Moving it back to Draft will allow editing and require re-approval. Continue?`
                  : `"${b.title}" will be restored to Draft status so you can edit it.`,
            confirmLabel: isPub ? "Unpublish to Draft" : "Move to Draft",
            destructive: isPub || isSched,
            onConfirm: () =>
              api("/blogs/" + b.id + "/transition", {
                method: "POST",
                body: { to: "draft" },
              }).then(refresh),
          });
        },
      },
    ];
    return acts;
  };

  const hasFilters =
    q ||
    status !== (statusFilter || "all") ||
    author !== "all" ||
    category !== "all" ||
    band !== "all";

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {statusFilter
              ? TABS.find((t) => t.v === statusFilter)?.l + " Blogs"
              : status !== "all"
                ? (TABS.find((t) => t.v === status)?.l || "All") + " Blogs"
                : "All Blogs"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data
              ? `${data.total} ${data.total === 1 ? "blog" : "blogs"} in your workspace`
              : "Loading…"}
          </p>
        </div>
        {can("blogs.create") && (
          <Button
            onClick={() => navigate("editor", { id: null })}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create Blog
          </Button>
        )}
      </div>

      {/* Tabs */}
      {!statusFilter && (
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <TabsList className="h-9 bg-muted/60 p-1 overflow-x-auto w-full justify-start sm:w-auto">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t.l}{" "}
                <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums inline-block min-w-[12px] text-center font-medium">
                  {counts[t.v] !== undefined ? counts[t.v] : ""}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search blogs…"
                className="pl-9 bg-muted/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={author}
                onValueChange={(v) => {
                  setAuthor(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9 bg-muted/40">
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All authors</SelectItem>
                  {(team || []).map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] h-9 bg-muted/40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={band}
                onValueChange={(v) => {
                  setBand(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9 bg-muted/40">
                  <SelectValue placeholder="SEO score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any SEO score</SelectItem>
                  <SelectItem value="high">High (80+)</SelectItem>
                  <SelectItem value="mid">Medium (60–79)</SelectItem>
                  <SelectItem value="low">Low (&lt;60)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px] h-9 bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="views">Most views</SelectItem>
                  <SelectItem value="seo_high">Highest SEO score</SelectItem>
                  <SelectItem value="seo_low">Lowest SEO score</SelectItem>
                  <SelectItem value="alpha">Title A–Z</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={() => {
                    setQ("");
                    setStatus(statusFilter || "all");
                    setAuthor("all");
                    setCategory("all");
                    setBand("all");
                    setPage(1);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden card-hover">
        {error ? (
          <EmptyState
            icon={FileText}
            title="Something went wrong"
            description="Unable to load your blogs. Please try again."
            onRetry={() => mutate()}
            action={null}
          />
        ) : !data ? (
          <SkeletonTable rows={7} cols={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? LayoutGrid : FileText}
            title={hasFilters ? "No matching blogs" : "No blogs yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filters to find what you are looking for."
                : "Create your first optimized article and start building organic traffic."
            }
            action={
              !hasFilters && can("blogs.create") ? (
                <Button onClick={() => navigate("editor", { id: null })}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Blog
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-semibold px-4 py-3">Blog</th>
                    <th className="text-left font-semibold px-3 py-3 hidden lg:table-cell">
                      Author
                    </th>
                    <th className="text-left font-semibold px-3 py-3 hidden xl:table-cell">
                      Category
                    </th>
                    <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right font-semibold px-3 py-3">
                      Views
                    </th>
                    <th className="text-center font-semibold px-3 py-3">SEO</th>
                    <th className="text-left font-semibold px-3 py-3">
                      Status
                    </th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors group cursor-pointer"
                      onClick={() => navigate("blog", { id: b.id })}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {b.featuredImage?.url ? (
                            <img
                              src={b.featuredImage.url}
                              alt=""
                              className="h-11 w-16 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="h-11 w-16 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium truncate max-w-[280px] group-hover:text-primary transition-colors">
                                {b.title}
                              </p>
                              {b.status === "draft" &&
                                b.reviewFeedback &&
                                !b.reviewFeedback.resolved && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 shrink-0 font-medium cursor-help"
                                    title={`Changes requested by ${b.reviewFeedback.requestedBy || "Reviewer"}${b.reviewFeedback.note ? ": " + b.reviewFeedback.note : ""}`}
                                  >
                                    Changes Requested
                                  </Badge>
                                )}
                            </div>
                            <p className="text-[11.5px] text-muted-foreground truncate max-w-[280px]">
                              /blogs/{b.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                              {initials(b.author)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[13px] text-muted-foreground">
                            {b.author}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal"
                        >
                          {b.category || "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-[13px]">
                        {b.status === "scheduled" ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1.5 whitespace-nowrap">
                              <Clock className="h-3.5 w-3.5 inline shrink-0" />
                              {b.scheduledAt
                                ? fmtDateTime(b.scheduledAt)
                                : "Pending"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Scheduled
                            </span>
                          </div>
                        ) : b.status === "published" ? (
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium">
                              {fmtDate(b.publishedAt || b.createdAt)}
                            </span>
                            {b.updatedAt &&
                            b.publishedAt &&
                            new Date(b.updatedAt).getTime() -
                              new Date(b.publishedAt).getTime() >
                              60000 ? (
                              <span className="text-[11px] text-muted-foreground">
                                Updated {timeAgo(b.updatedAt)}
                              </span>
                            ) : null}
                          </div>
                        ) : b.status === "draft" ? (
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {fmtDate(b.updatedAt || b.createdAt)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Edited {timeAgo(b.updatedAt || b.createdAt)}
                            </span>
                          </div>
                        ) : b.status === "in_review" ? (
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {fmtDate(b.updatedAt || b.createdAt)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Submitted {timeAgo(b.updatedAt || b.createdAt)}
                            </span>
                          </div>
                        ) : b.status === "approved" ? (
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {fmtDate(b.updatedAt || b.createdAt)}
                            </span>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Approved {timeAgo(b.updatedAt || b.createdAt)}
                            </span>
                          </div>
                        ) : b.status === "archived" ? (
                          <div className="flex flex-col">
                            {b.publishedAt ? (
                              <>
                                <span className="text-foreground font-medium">
                                  {fmtDate(b.publishedAt)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Archived{" "}
                                  {timeAgo(b.archivedAt || b.updatedAt)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-muted-foreground font-medium">
                                  {fmtDate(b.createdAt)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Archived{" "}
                                  {timeAgo(b.archivedAt || b.updatedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">
                              {fmtDate(b.updatedAt || b.createdAt)}
                            </span>
                            <span className="text-[11px] text-muted-foreground capitalize">
                              {b.status || "Updated"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {fmtNum(b.analytics?.views)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <ScoreRing
                            value={b.seo?.score || 0}
                            size={38}
                            thickness={4.5}
                            showLabel={false}
                          />
                        </div>
                        <span className="sr-only">
                          SEO score {b.seo?.score}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td
                        className="px-2 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                          <DropdownMenuContent align="end" className="w-44">
                            {actionsFor(b)
                              .filter((a) => a.show)
                              .map((a, i) => (
                                <DropdownMenuItem key={i} onClick={a.onClick}>
                                  <a.icon className="h-4 w-4 mr-2" />
                                  {a.label}
                                </DropdownMenuItem>
                              ))}
                            {can("blogs.delete") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-rose-600 dark:text-rose-400"
                                  onClick={() => {
                                    setConfirmDialog({
                                      title: "Delete this blog?",
                                      description: `“${b.title}” will be permanently removed. This action cannot be undone.`,
                                      confirmLabel: "Delete",
                                      destructive: true,
                                      onConfirm: () =>
                                        api("/blogs/" + b.id, {
                                          method: "DELETE",
                                        }).then(refresh),
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pages={data.pages}
              onPage={setPage}
              total={data?.total}
              limit={limit}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemName="blogs"
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={(o) => !o && setConfirmDialog(null)}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.description || ""}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        destructive={confirmDialog?.destructive ?? true}
        onConfirm={() => {
          confirmDialog?.onConfirm?.();
          setConfirmDialog(null);
        }}
      />

      <RequestChangesDialog
        open={!!requestChangesBlog}
        onOpenChange={(o) => !o && setRequestChangesBlog(null)}
        blogTitle={requestChangesBlog?.title || ""}
        onConfirm={(feedback) => {
          const b = requestChangesBlog;
          setRequestChangesBlog(null);
          api("/blogs/" + b.id + "/transition", {
            method: "POST",
            body: { to: "draft", feedback },
          }).then(refresh);
        }}
      />

      <ScheduleDialog
        open={!!scheduleBlog}
        onOpenChange={(o) => !o && setScheduleBlog(null)}
        blogTitle={scheduleBlog?.title || ""}
        scheduledAt={scheduleBlog?.scheduledAt}
        status={scheduleBlog?.status}
        onConfirm={(iso) => {
          const b = scheduleBlog;
          setScheduleBlog(null);
          api("/blogs/" + b.id + "/transition", {
            method: "POST",
            body: { to: "scheduled", scheduledAt: iso },
          }).then(refresh);
        }}
      />
    </div>
  );
}
