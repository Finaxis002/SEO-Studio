"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
  FolderOpen,
  Eye,
  Video,
  ThumbsUp,
  Clock,
  Copy,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  FileText,
  LayoutGrid,
  CalendarClock,
  Archive,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryIcon from "@/components/views/CategoryIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  api,
  fetcher,
  fmtDate,
  fmtDateTime,
  timeAgo,
  fmtNum,
  initials,
} from "@/lib/client";
import {
  StatusBadge,
  Pagination,
  EmptyState,
  SkeletonTable,
  ScheduleDialog,
} from "../bits";

const STATUS_TABS = [
  { v: "all", l: "All" },
  { v: "published", l: "Published" },
  { v: "scheduled", l: "Scheduled" },
  { v: "draft", l: "Drafts" },
  { v: "archived", l: "Archived" },
];

export default function KnowledgeBaseView({ navigate, can = () => true }) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Scheduling modal state
  const [schedulingGuide, setSchedulingGuide] = useState(null);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedStatus, selectedCategory, selectedAuthor, sort]);

  // Fetch categories for filter dropdown

const { data: catData } = useSWR("/api/kb/categories", fetcher);
const categories = catData?.categories || [];

const categoriesById = useMemo(() => {
  const map = {};

  for (const category of categories) {
    if (category.id) {
      map[category.id] = category;
    }

    if (category.slug) {
      map[category.slug] = category;
    }
  }

  return map;
}, [categories]);


  // Fetch team / authors
  const { data: teamData } = useSWR("/api/team", fetcher);
  const teamMembers = teamData || [];

  // Fetch articles with all filters
  const articlesUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (selectedStatus !== "all") p.set("status", selectedStatus);
    if (selectedCategory !== "all") p.set("categoryId", selectedCategory);
    if (selectedAuthor !== "all") p.set("author", selectedAuthor);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return `/api/kb/articles?${p.toString()}`;
  }, [search, selectedStatus, selectedCategory, selectedAuthor, sort, page, limit]);

  const { data, error, mutate, isLoading } = useSWR(articlesUrl, fetcher, {
    keepPreviousData: true,
  });

  const articles = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  // Category counts map for order display
  const categoryCounts = useMemo(() => {
    const map = {};
    for (const c of categories) {
      if (c.id) map[c.id] = c.articleCount || 0;
      if (c.slug) map[c.slug] = c.articleCount || 0;
    }
    return map;
  }, [categories]);

  // Status Tab counts (uses API counts if present, or caches/fallbacks)
  const [savedCounts, setSavedCounts] = useState({});
  useEffect(() => {
    if (data?.counts) {
      setSavedCounts((prev) => ({ ...prev, ...data.counts }));
    }
  }, [data?.counts]);

  const counts = useMemo(() => {
    if (data?.counts) return data.counts;
    if (savedCounts && Object.keys(savedCounts).length > 0) return savedCounts;
    let pub = 0, sch = 0, drf = 0, arc = 0;
    articles.forEach((a) => {
      if (a.status === "published") pub++;
      else if (a.status === "scheduled") sch++;
      else if (a.status === "archived") arc++;
      else drf++;
    });
    return { all: total, published: pub, scheduled: sch, draft: drf, archived: arc };
  }, [data?.counts, savedCounts, articles, total]);

  // Available authors list from team (matches Blogs.js)
  const authorsList = useMemo(() => {
    return (teamMembers || [])
      .map((m) => m?.name?.trim())
      .filter(Boolean);
  }, [teamMembers]);

  // Category search filter states
  const [catSearch, setCatSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  // Filtered categories for category search dropdown
  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [categories, catSearch]);

  const activeCategory = useMemo(() => {
    if (selectedCategory === "all") return null;
    return (
      categories.find(
        (c) => c.id === selectedCategory || c.slug === selectedCategory
      ) || null
    );
  }, [categories, selectedCategory]);

  // Check if any filter is actively applied
  const hasFilters =
    Boolean(search) ||
    selectedStatus !== "all" ||
    selectedCategory !== "all" ||
    selectedAuthor !== "all" ||
    sort !== "newest";

  const resetFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSelectedAuthor("all");
    setSort("newest");
    setCatSearch("");
    setPage(1);
  };

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!articleToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/kb/articles/${articleToDelete.id}`);
      toast.success(`Guide "${articleToDelete.title}" deleted.`);
      mutate();
      setDeleteModalOpen(false);
      setArticleToDelete(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete guide");
    } finally {
      setDeleting(false);
    }
  };

  const copyPublicLink = (article) => {
    const vinimayUrl = process.env.NEXT_PUBLIC_VINIMAY_URL || "https://vinimay.sharda.co.in";
    const fullUrl = `${vinimayUrl}/knowledge-base/${article.categorySlug}/${article.slug}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Public tutorial link copied to clipboard!");
  };

  const handleTransition = async (art, newStatus, extraData = {}) => {
    try {
      await api.put(`/kb/articles/${art.id}`, { status: newStatus, ...extraData });
      if (newStatus === "published") {
        toast.success(`"${art.title}" is now published live! 🎉`);
      } else if (newStatus === "archived") {
        toast.success(`"${art.title}" moved to Archived.`);
      } else if (newStatus === "draft") {
        toast.success(`"${art.title}" moved to Draft.`);
      } else if (newStatus === "scheduled") {
        toast.success(`"${art.title}" scheduled successfully.`);
      }
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to update guide status");
    }
  };

  const handleMoveOrder = async (art, delta) => {
    const currentOrder = typeof art.order === "number" ? art.order : 1;
    const newOrder = Math.max(1, currentOrder + delta);
    if (newOrder === currentOrder) return;
    try {
      await api.put(`/kb/articles/${art.id}`, { order: newOrder });
      toast.success(`Updated order for "${art.title}" to ${newOrder}`);
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to update order");
    }
  };

  const handleConfirmSchedule = async ({ scheduledAt }) => {
    if (!schedulingGuide) return;
    setSchedulingLoading(true);
    try {
      await api.put(`/kb/articles/${schedulingGuide.id}`, {
        status: "scheduled",
        scheduledAt,
      });
      toast.success(`"${schedulingGuide.title}" scheduled for ${fmtDateTime(scheduledAt)}`);
      mutate();
      setSchedulingGuide(null);
    } catch (err) {
      toast.error(err.message || "Failed to schedule guide");
    } finally {
      setSchedulingLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up max-w-7xl mx-auto pb-16">
      {/* 1. Header (Matching Blogs UI/UX) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {selectedStatus !== "all"
              ? (STATUS_TABS.find((t) => t.v === selectedStatus)?.l || "All") + " Guides"
              : "All Guides"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data
              ? `${total} ${total === 1 ? "guide" : "guides"} in your workspace`
              : "Loading…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(can("kb.categories") || can("settings.edit") || can("blogs.edit")) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("kb-categories")}
              className="text-xs font-medium"
            >
              <FolderOpen className="w-4 h-4 mr-1.5 text-muted-foreground" />
              Manage Categories
            </Button>
          )}

          {(can("kb.create") || can("blogs.create")) && (
            <Button
              onClick={() => navigate("kb-editor", { articleId: "new" })}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Guide
            </Button>
          )}
        </div>
      </div>

      {/* 2. Status Filter Tabs (Includes Scheduled Tab) */}
      <Tabs
        value={selectedStatus}
        onValueChange={(v) => {
          setSelectedStatus(v);
          setPage(1);
        }}
      >
        <TabsList className="h-9 bg-muted/60 p-1 overflow-x-auto w-full justify-start sm:w-auto">
          {STATUS_TABS.map((t) => (
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

      {/* 3. Toolbar: Search & Select Filters */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search guides by title, steps, or keywords…"
                className="pl-9 bg-muted/40 text-xs sm:text-sm"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2">
              {/* Author Filter */}
              <Select
                value={selectedAuthor}
                onValueChange={(v) => {
                  setSelectedAuthor(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9 bg-muted/40 text-xs">
                  <SelectValue placeholder="All authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All authors</SelectItem>
                  {authorsList.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter with Searchbar */}
              <Popover
                open={catOpen}
                onOpenChange={(o) => {
                  setCatOpen(o);
                  if (!o) setCatSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-[170px] sm:w-[190px] h-9 bg-muted/40 text-xs font-normal justify-between px-3 hover:bg-accent/40"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {activeCategory ? (
                        <>
                          <CategoryIcon
                            icon={activeCategory.icon}
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{activeCategory.name}</span>
                        </>
                      ) : (
                        <span className="truncate text-foreground">All categories</span>
                      )}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-1.5 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-1.5 w-[220px] shadow-lg z-50"
                  align="start"
                >
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60 mb-1">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      placeholder="Search category..."
                      className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    {catSearch && (
                      <button
                        type="button"
                        onClick={() => setCatSearch("")}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setPage(1);
                        setCatOpen(false);
                        setCatSearch("");
                      }}
                      className={
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left " +
                        (selectedCategory === "all"
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold"
                          : "hover:bg-accent text-foreground")
                      }
                    >
                      <span className="truncate">All categories</span>
                      {selectedCategory === "all" && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 ml-1.5" />
                      )}
                    </button>

                    {filteredCategories.length === 0 ? (
                      <div className="py-3 text-center text-xs text-muted-foreground">
                        No categories found
                      </div>
                    ) : (
                      filteredCategories.map((c) => {
                        const isSelected = selectedCategory === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(c.id);
                              setPage(1);
                              setCatOpen(false);
                              setCatSearch("");
                            }}
                            className={
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left " +
                              (isSelected
                                ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold"
                                : "hover:bg-accent text-foreground")
                            }
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <CategoryIcon
                                icon={c.icon}
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              />
                              <span className="truncate">{c.name}</span>
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sort Dropdown */}
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px] h-9 bg-muted/40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="order">Category order</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="views">Most views</SelectItem>
                  <SelectItem value="alpha">Title A–Z</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground text-xs"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Guides Table */}
      <Card className="overflow-hidden card-hover">
        {error ? (
          <EmptyState
            icon={FileText}
            title="Something went wrong"
            description="Unable to load knowledge base guides. Please try again."
            onRetry={() => mutate()}
            action={null}
          />
        ) : isLoading && !data ? (
          <SkeletonTable rows={6} cols={7} />
        ) : articles.length === 0 ? (
          <EmptyState
            icon={hasFilters ? LayoutGrid : BookOpen}
            title={hasFilters ? "No matching guides" : "No guides yet"}
            description={
              hasFilters
                ? "Try adjusting your search query, status, or category filter."
                : "Create your first customer tutorial to empower Vinimay users."
            }
            action={
              !hasFilters && can("blogs.create") ? (
                <Button
                  onClick={() => navigate("kb-editor", { articleId: "new" })}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create Guide
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
                    {/* Order column restored */}
                    <th className="px-3 py-3 font-semibold text-center whitespace-nowrap min-w-[105px]">
                      Order
                    </th>
                    <th className="text-left font-semibold px-4 py-3">Guide</th>
                    <th className="text-left font-semibold px-3 py-3 hidden lg:table-cell">
                      Category
                    </th>
                    <th className="text-left font-semibold px-3 py-3 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right font-semibold px-3 py-3 whitespace-nowrap">Views & Helpful</th>
                    <th className="text-center font-semibold px-3 py-3">Content</th>
                    <th className="text-left font-semibold px-3 py-3">Status</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {articles.map((art) => {
                    const stepCount = Array.isArray(art.steps) ? art.steps.length : 0;
                    const hasVideo = Boolean(art.videoUrl);

                    const catTotal =
                      categoryCounts[art.categoryId] ||
                      categoryCounts[art.categorySlug] ||
                      1;
                    const maxInCat = Math.max(art.order ?? 1, catTotal);

                    const isPub = art.status === "published";
                    const isSched = art.status === "scheduled";
                    const isDraft = art.status === "draft";
                    const isArch = art.status === "archived";

                    return (
                      <tr
                        key={art.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors group cursor-pointer"
                        onClick={() => navigate("kb-detail", { articleId: art.id })}
                      >
                        {/* 1. Category Order (Up / Down move arrows restored!) */}
                        <td
                          className="px-3 py-3 whitespace-nowrap text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="inline-flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-0.5 border border-border"
                            title={`Order #${art.order ?? 1} of ${maxInCat} in ${art.categoryName || "category"}`}
                          >
                            <span className="text-xs font-mono font-medium">
                              #{art.order ?? 1}{" "}
                              <span className="text-[11px] text-muted-foreground font-normal">
                                of {maxInCat}
                              </span>
                            </span>
                            {(can("kb.edit") || can("blogs.edit")) && (
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={(art.order ?? 1) <= 1}
                                  onClick={() => handleMoveOrder(art, -1)}
                                  className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
                                  title="Move Guide Up"
                                >
                                  <ChevronUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={(art.order ?? 1) >= maxInCat}
                                  onClick={() => handleMoveOrder(art, 1)}
                                  className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
                                  title="Move Guide Down"
                                >
                                  <ChevronDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Guide Title & Slug (NO image/book box as requested) */}
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[340px] group-hover:text-primary transition-colors text-[13.5px]">
                              {art.title}
                            </p>
                            <p className="text-[11.5px] text-muted-foreground truncate max-w-[340px] font-mono mt-0.5">
                              /{art.categorySlug || "guide"}/{art.slug}
                            </p>
                          </div>
                        </td>

                        
                                                          
                               {/* 3. Category */}
                                <td className="px-3 py-3 hidden lg:table-cell">
                      {(() => {
                           const category =
                               categoriesById[art.categoryId] ||
                           categoriesById[art.categorySlug];

                                        return (
                                            <Badge
                                            variant="outline"
                                        className="inline-flex items-center gap-1.5 bg-muted/30 text-[11px] font-normal"
                                           >
                                              <CategoryIcon
                                           icon={category?.icon}
                                         className="h-3.5 w-3.5 shrink-0"
                                                   />
                                                        <span>
                                                  {art.categoryName || category?.name || "General"}
                                                     </span>
                                                    </Badge>
                                                          );
                                                              })()}
                                                  </td>


                        {/* 4. Date & Updated */}
                        <td className="px-3 py-3 hidden md:table-cell text-[13px]">
                          {isSched ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1.5 whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5 inline shrink-0" />
                                {art.scheduledAt ? fmtDateTime(art.scheduledAt) : "Pending"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">Scheduled</span>
                            </div>
                          ) : isPub ? (
                            <div className="flex flex-col">
                              <span className="text-foreground font-medium">
                                {fmtDate(art.publishedAt || art.createdAt)}
                              </span>
                              {art.updatedAt && (
                                <span className="text-[11px] text-muted-foreground">
                                  Updated {timeAgo(art.updatedAt)}
                                </span>
                              )}
                            </div>
                          ) : isDraft ? (
                            <div className="flex flex-col">
                              <span className="text-foreground">
                                {fmtDate(art.updatedAt || art.createdAt)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Last edited {timeAgo(art.updatedAt || art.createdAt)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-foreground">
                                {fmtDate(art.updatedAt || art.createdAt)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {timeAgo(art.updatedAt || art.createdAt)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 5. Views & Helpful Rating */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {(() => {
                            const happy = art.helpfulStats?.happy || 0;
                            const sad = art.helpfulStats?.sad || 0;
                            const neutral = art.helpfulStats?.neutral || 0;
                            const total = happy + neutral + sad;
                            const pct = total > 0 ? Math.round((happy / total) * 100) : null;
                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-[13px] font-semibold text-foreground tabular-nums">
                                  {fmtNum(art.views || 0)} views
                                </span>
                                {total > 0 ? (
                                  <span className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {pct}% helpful ({total})
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground mt-0.5">
                                    No ratings yet
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 6. Content Features (Steps, Video) */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground text-[11.5px]">
                              {stepCount} Steps
                            </span>
                            {hasVideo && (
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px] bg-red-500/10 text-red-600 border-red-500/20 font-semibold"
                                title="Includes video tutorial walkthrough"
                              >
                                <Video className="w-2.5 h-2.5 mr-0.5 inline" /> Video
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* 7. Status Badge */}
                        <td className="px-3 py-3">
                          <StatusBadge status={art.status || "draft"} />
                        </td>

                        {/* 9. Actions Menu */}
                        <td
                          className="px-3 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                onClick={() => navigate("kb-detail", { articleId: art.id })}
                                className="cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2" /> View in Studio
                              </DropdownMenuItem>

                              {(can("kb.edit") || can("blogs.edit")) && (
                                <DropdownMenuItem
                                  onClick={() => navigate("kb-editor", { articleId: art.id })}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4 mr-2" /> Edit Guide
                                </DropdownMenuItem>
                              )}

                              {/* View on Vinimay (ONLY if published) */}
                              {art.status === "published" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const vinimayUrl =
                                      process.env.NEXT_PUBLIC_VINIMAY_URL ||
                                      "https://vinimay.sharda.co.in";
                                    const fullUrl = `${vinimayUrl}/knowledge-base/${art.categorySlug}/${art.slug}`;
                                    window.open(fullUrl, "_blank");
                                  }}
                                  className="cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" /> View on Vinimay
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => copyPublicLink(art)}
                                className="cursor-pointer"
                              >
                                <Copy className="w-4 h-4 mr-2" /> Copy Link
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* CONDITIONAL ACTIONS BASED ON STATUS */}

                              {/* 1. DRAFT */}
                              {art.status === "draft" && (
                                <>
                                  {(can("kb.publish") || can("blogs.publish")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "published")}
                                      className="cursor-pointer"
                                    >
                                      <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                                      Publish Live Now
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.schedule") || can("blogs.schedule")) && (
                                    <DropdownMenuItem
                                      onClick={() => setSchedulingGuide(art)}
                                      className="cursor-pointer"
                                    >
                                      <CalendarClock className="w-4 h-4 mr-2 text-violet-600" />
                                      Schedule Guide
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.archive") || can("blogs.archive")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "archived")}
                                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                                    >
                                      <Archive className="w-4 h-4 mr-2 text-amber-600" />
                                      Archive Guide
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              {/* 2. SCHEDULED */}
                              {art.status === "scheduled" && (
                                <>
                                  {(can("kb.publish") || can("blogs.publish")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "published")}
                                      className="cursor-pointer"
                                    >
                                      <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                                      Publish Live Now
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.schedule") || can("blogs.schedule")) && (
                                    <DropdownMenuItem
                                      onClick={() => setSchedulingGuide(art)}
                                      className="cursor-pointer"
                                    >
                                      <CalendarClock className="w-4 h-4 mr-2 text-violet-600" />
                                      Reschedule Guide
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.schedule") || can("blogs.schedule")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "draft", { scheduledAt: null })}
                                      className="cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                                      Cancel Schedule (To Draft)
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.archive") || can("blogs.archive")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "archived")}
                                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                                    >
                                      <Archive className="w-4 h-4 mr-2 text-amber-600" />
                                      Archive Guide
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              {/* 3. PUBLISHED (No Schedule Guide!) */}
                              {art.status === "published" && (
                                <>
                                  {(can("kb.publish") || can("blogs.publish")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "draft")}
                                      className="cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                                      Unpublish to Draft
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.archive") || can("blogs.archive")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "archived")}
                                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                                    >
                                      <Archive className="w-4 h-4 mr-2 text-amber-600" />
                                      Archive Guide
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              {/* 4. ARCHIVED */}
                              {art.status === "archived" && (
                                <>
                                  {(can("kb.edit") || can("blogs.edit")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "draft")}
                                      className="cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2 text-sky-600" />
                                      Restore to Draft
                                    </DropdownMenuItem>
                                  )}
                                  {(can("kb.publish") || can("blogs.publish")) && (
                                    <DropdownMenuItem
                                      onClick={() => handleTransition(art, "published")}
                                      className="cursor-pointer"
                                    >
                                      <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                                      Publish Live Now
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              {/* Delete Guide */}
                              {(can("kb.delete") || can("blogs.delete")) && (
                                <DropdownMenuItem
                                  className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer"
                                  onClick={() => {
                                    setArticleToDelete(art);
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Guide
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {articles.length > 0 && (
              <Pagination
                page={page}
                pages={pages}
                total={total}
                limit={limit}
                onPage={(p) => setPage(p)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                itemName="guides"
              />
            )}
          </>
        )}
      </Card>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={Boolean(schedulingGuide)}
        onOpenChange={(op) => !op && setSchedulingGuide(null)}
        blogTitle={schedulingGuide?.title || ""}
        status={schedulingGuide?.status}
        scheduledAt={schedulingGuide?.scheduledAt}
        onConfirm={handleConfirmSchedule}
        loading={schedulingLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete Guide?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Are you sure you want to permanently delete{" "}
            <strong>"{articleToDelete?.title}"</strong>? This will remove it from the Vinimay Help
            Center.
          </p>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
