"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Eye,
  Copy,
  Trash2,
  Globe,
  Clock,
  Video,
  HelpCircle,
  BarChart3,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Check,
  Image as ImageIcon,
  Link2,
  Maximize2,
  FileText,
  ListOrdered,
  AlertTriangle,
  Bookmark,
  CalendarClock,
  Archive,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, fetcher, fmtDate, timeAgo, initials, getVinimayUrl } from "@/lib/client";
import { ScheduleDialog } from "../bits";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "mr", label: "मराठी (Marathi)", flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી (Gujarati)", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు (Telugu)", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা (Bengali)", flag: "🇮🇳" },
];

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
}

export default function KbDetail({ articleId, returnView, navigate, can }) {
  const [activeTab, setActiveTab] = useState("content");
  const [previewLang, setPreviewLang] = useState("en");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Fetch article data
  const { data, error, mutate } = useSWR(
    articleId ? `/api/kb/articles/${articleId}` : null,
    fetcher
  );
  const article = data?.article;

  // Fetch categories to get category rank/count
  const { data: catData } = useSWR("/api/kb/categories", fetcher);
  const categories = catData?.categories || [];
  const currentCategory = categories.find(
    (c) => c.id === article?.categoryId || c.slug === article?.categorySlug
  );

  // Translations
  const translations = article?.translations || {};
  const availableLangs = useMemo(() => {
    const langs = ["en"];
    Object.keys(translations).forEach((k) => {
      if (translations[k]?.title || translations[k]?.contentHtml) {
        langs.push(k);
      }
    });
    return langs;
  }, [translations]);

  // Active translation preview data
  const activeTranslation =
    previewLang !== "en" && translations[previewLang]
      ? translations[previewLang]
      : null;

  const displayTitle = activeTranslation?.title || article?.title || "";
  const displayOverview = activeTranslation?.overview || article?.overview || "";
  const displayContentHtml = activeTranslation?.contentHtml || article?.contentHtml || "";
  const displaySteps = activeTranslation?.steps || article?.steps || [];
  const displayFaqs = activeTranslation?.faqs || article?.faqs || [];

  // Public Vinimay URL
  const vinimayPublicUrl = useMemo(() => {
    if (!article) return "";
    const base = process.env.NEXT_PUBLIC_VINIMAY_URL || "https://vinimay.sharda.co.in";
    const catSlug = article.categorySlug || "getting-started";
    return `${base}/knowledge-base/${catSlug}/${article.slug}`;
  }, [article]);

  // YouTube embed
  const embedVideoUrl = useMemo(
    () => (article?.videoUrl ? getYouTubeEmbedUrl(article.videoUrl) : null),
    [article?.videoUrl]
  );

  // Dynamically extract headings and inject IDs into displayContentHtml for accurate Table of Contents
  const { renderedContentHtml, dynamicHeadings } = useMemo(() => {
    if (!displayContentHtml) {
      return { renderedContentHtml: "", dynamicHeadings: [] };
    }

    // Strip editor-only toolbar / buttons from video wrappers for clean preview view
    const cleanDisplayHtml = displayContentHtml
      .replace(/<div\s+contenteditable="false"[^>]*>[\s\S]*?kb-(?:edit|delete)-video-btn[\s\S]*?<\/div>/gi, "")
      .replace(/<button[^>]*class="kb-(?:edit|delete)-video-btn"[^>]*>[\s\S]*?<\/button>/gi, "");

    let headingIdx = 0;
    const headings = [];

    const modifiedHtml = cleanDisplayHtml.replace(
      /<(h[23])(\s+[^>]*)?>([\s\S]*?)<\/\1>/gi,
      (match, tag, attrs = "", innerContent) => {
        headingIdx++;
        const plainText = innerContent.replace(/<[^>]*>/g, "").trim();
        const uniqueId = `guide-sec-${headingIdx}`;

        headings.push({
          id: uniqueId,
          text: plainText,
          level: tag.toLowerCase(),
        });

        const cleanAttrs = (attrs || "").replace(/\s+id=["'][^"']*["']/i, "");
        return `<${tag}${cleanAttrs} id="${uniqueId}" class="scroll-mt-28">${innerContent}</${tag}>`;
      }
    );

    return {
      renderedContentHtml: modifiedHtml,
      dynamicHeadings: headings,
    };
  }, [displayContentHtml]);

  // Check if contentHtml already includes specific standard sections to prevent duplicate rendering
  const hasContentOverview = useMemo(
    () => dynamicHeadings.some((h) => h.text.trim().toLowerCase() === "overview"),
    [dynamicHeadings]
  );
  const hasContentPrerequisites = useMemo(
    () =>
      dynamicHeadings.some((h) => {
        const t = h.text.trim().toLowerCase();
        return t.includes("prerequisite") || t.includes("why use this feature");
      }),
    [dynamicHeadings]
  );
  const hasContentSteps = useMemo(
    () =>
      dynamicHeadings.some((h) => {
        const t = h.text.trim().toLowerCase();
        return t.includes("step") || t.includes("instruction") || t.includes("how to");
      }),
    [dynamicHeadings]
  );

  // Scroll spy for Right-side Table of Contents
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = [
        ...(displayOverview && !hasContentOverview ? ["overview"] : []),
        ...(article?.prerequisites?.length && !hasContentPrerequisites ? ["why-use-this-feature"] : []),
        ...dynamicHeadings.map((h) => h.id),
        ...(displaySteps?.length && !hasContentSteps ? ["step-by-step-guide"] : []),
        ...(embedVideoUrl ? ["video"] : []),
        ...(displayFaqs?.length ? ["faqs"] : []),
      ];

      const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

      const scrollPos = window.scrollY + 160;
      let current = "";
      sections.forEach((sec) => {
        if (sec.offsetTop <= scrollPos) {
          current = sec.id;
        }
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [displayOverview, article?.prerequisites, dynamicHeadings, displaySteps, embedVideoUrl, displayFaqs]);

  // Smooth scroll helper
  const scrollTo = (id) => {
    const elem = document.getElementById(id);
    if (elem) {
      const top = elem.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  // Extract all images from contentHtml AND steps
  const allImages = useMemo(() => {
    const list = [];
    if (article?.steps) {
      article.steps.forEach((s, idx) => {
        if (s.imageUrl) {
          list.push({
            src: s.imageUrl,
            alt: s.title || `Step ${idx + 1} illustration`,
            caption: `Step ${idx + 1}: ${s.title || "Illustration"}`,
            source: "Step Image",
          });
        }
      });
    }
    if (article?.contentHtml) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(article.contentHtml)) !== null) {
        const fullTag = match[0];
        const src = match[1];
        const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : "";
        if (!list.some((item) => item.src === src)) {
          list.push({
            src,
            alt: alt || "Article Content Image",
            caption: alt || "Article Content Image",
            source: "Content Editor",
          });
        }
      }
    }
    return list;
  }, [article]);

  // Extract all links from contentHtml
  const { internalLinks, externalLinks } = useMemo(() => {
    const internal = [];
    const external = [];
    if (!article?.contentHtml) return { internalLinks: internal, externalLinks: external };

    const aRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = aRegex.exec(article.contentHtml)) !== null) {
      const href = match[1];
      const rawText = match[2].replace(/<[^>]*>/g, "").trim();
      const text = rawText || href;
      const isInternal =
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.includes("vinimay.sharda.co.in") ||
        href.includes("localhost");

      if (isInternal) {
        if (!internal.some((l) => l.href === href)) {
          internal.push({ href, text });
        }
      } else {
        if (!external.some((l) => l.href === href)) {
          external.push({ href, text });
        }
      }
    }
    return { internalLinks: internal, externalLinks: external };
  }, [article?.contentHtml]);

  const totalLinksCount = internalLinks.length + externalLinks.length;

  // Word count calculation
  const wordCount = useMemo(() => {
    if (!article) return 0;
    let fullText = (article.overview || "") + " " + (article.contentHtml || "");
    if (article.steps) {
      article.steps.forEach((s) => {
        fullText += " " + (s.title || "") + " " + (s.instruction || "");
      });
    }
    if (article.faqs) {
      article.faqs.forEach((f) => {
        fullText += " " + (f.question || "") + " " + (f.answer || "");
      });
    }
    const plain = fullText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return plain ? plain.split(/\s+/).length : 0;
  }, [article]);

  // Analytics & Satisfaction
  const feedbackStats = useMemo(() => {
    const happy = article?.helpfulStats?.happy || article?.feedback?.happy || 0;
    const neutral = article?.helpfulStats?.neutral || article?.feedback?.neutral || 0;
    const sad = article?.helpfulStats?.sad || article?.feedback?.sad || 0;
    const total = happy + neutral + sad;
    const satisfaction = total > 0 ? Math.round((happy / total) * 100) : null;
    return { happy, neutral, sad, total, satisfaction };
  }, [article?.feedback, article?.helpfulStats]);

  // Handlers
  const handleCopyLink = () => {
    if (!vinimayPublicUrl) return;
    navigator.clipboard.writeText(vinimayPublicUrl);
    toast.success("Public tutorial link copied to clipboard!");
  };

  const handleCopyVideoUrl = () => {
    if (!article?.videoUrl) return;
    navigator.clipboard.writeText(article.videoUrl);
    toast.success("Video URL copied to clipboard!");
  };

  const handleTransition = async (newStatus, extraData = {}) => {
    if (!article || togglingStatus) return;
    setTogglingStatus(true);
    try {
      await api.put(`/kb/articles/${article.id}`, { status: newStatus, ...extraData });
      if (newStatus === "published") {
        toast.success("Guide published live on Vinimay! 🎉");
      } else if (newStatus === "archived") {
        toast.success("Guide moved to Archived.");
      } else if (newStatus === "draft") {
        toast.success("Guide moved to Draft.");
      } else if (newStatus === "scheduled") {
        toast.success("Guide scheduled successfully.");
      }
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to update guide status");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!article || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/kb/articles/${article.id}`);
      toast.success(`Guide "${article.title}" deleted.`);
      navigate(returnView || "kb");
    } catch (err) {
      toast.error(err.message || "Failed to delete guide");
      setDeleting(false);
    }
  };

  // Loading skeleton state
  if (!data && !error) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-12 text-center">
        <h2 className="text-xl font-bold">Guide Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested knowledge base article could not be loaded or has been deleted.
        </p>
        <Button onClick={() => navigate(returnView || "kb")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* 1. Header Card (Clean, without SEO ring) */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            {/* Left Column: Meta & Title */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Top Row: Back button + Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(returnView || "kb")}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground -ml-1 mr-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Guides
                </Button>

                {/* Category Badge */}
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold bg-[#7552da]/10 text-[#7552da] border-[#7552da]/30 gap-1 px-2.5 py-0.5"
                >
                  <span>{currentCategory?.icon || "🚀"}</span>
                  <span>{currentCategory?.name || article.categoryName}</span>
                </Badge>

                {/* Category Order Rank */}
                <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground">
                  Order #{article.order || 1}
                </Badge>

                {/* Status Badge */}
                {article.status === "published" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold">
                    Published Live
                  </Badge>
                ) : article.status === "scheduled" ? (
                  <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 text-[11px] font-semibold gap-1">
                    <Clock className="w-3 h-3" /> Scheduled for {fmtDate(article.scheduledAt)}
                  </Badge>
                ) : article.status === "archived" ? (
                  <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-500/30 bg-amber-500/10 font-semibold">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground font-semibold">
                    Draft
                  </Badge>
                )}

                {/* Languages Live Badge */}
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium gap-1 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300"
                >
                  <Globe className="h-3 w-3" /> {availableLangs.length} Languages Live
                </Badge>
              </div>

              {/* Guide Title */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                {article.title}
              </h1>

              {/* Subtitle / Slug */}
              <p className="text-xs font-mono text-muted-foreground truncate">
                /{article.categorySlug}/{article.slug}
              </p>

              {/* Metadata Info Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700 font-bold">
                      {initials(article.author || "Admin")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{article.author || "Admin"}</span>
                </span>
                <span>·</span>
                <span>
                  {article.status === "published"
                    ? `Published ${fmtDate(article.publishedAt || article.createdAt)}`
                    : article.status === "scheduled"
                    ? `Scheduled for ${fmtDate(article.scheduledAt)}`
                    : `Created ${fmtDate(article.createdAt)}`}
                  {article.updatedAt && ` · Updated ${timeAgo(article.updatedAt)}`}
                </span>
                <span>·</span>
                <span>{wordCount} words</span>
                <span>·</span>
                <span>{article.steps?.length || 0} Steps</span>
                <span>·</span>
                <span>{allImages.length} Images</span>
                <span>·</span>
                <span>{article.faqs?.length || 0} FAQs</span>
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
              {can("blogs.edit") && (
                <Button
                  size="sm"
                  onClick={() => navigate("kb-editor", { articleId: article.id })}
                  className="bg-[#7552da] hover:bg-[#623fd0] text-white shadow-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Guide
                </Button>
              )}

              {article.status === "published" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(vinimayPublicUrl, "_blank")}
                  className="hover:text-[#7552da] hover:border-[#7552da]/40 text-xs font-medium"
                  title="View guide live on Vinimay website"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  View Live
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="text-xs"
                title="Copy public tutorial URL"
              >
                <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> Copy Link
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {/* 1. DRAFT */}
                  {article.status === "draft" && (
                    <>
                      {can("blogs.publish") && (
                        <DropdownMenuItem
                          onClick={() => handleTransition("published")}
                          disabled={togglingStatus}
                          className="cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                          Publish Live Now
                        </DropdownMenuItem>
                      )}
                      {can("blogs.publish") && (
                        <DropdownMenuItem onClick={() => setScheduleOpen(true)} className="cursor-pointer">
                          <CalendarClock className="w-4 h-4 mr-2 text-violet-600" />
                          Schedule Guide
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleTransition("archived")}
                        disabled={togglingStatus}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="w-4 h-4 mr-2 text-amber-600" />
                        Archive Guide
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* 2. SCHEDULED */}
                  {article.status === "scheduled" && (
                    <>
                      {can("blogs.publish") && (
                        <DropdownMenuItem
                          onClick={() => handleTransition("published")}
                          disabled={togglingStatus}
                          className="cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                          Publish Live Now
                        </DropdownMenuItem>
                      )}
                      {can("blogs.publish") && (
                        <DropdownMenuItem onClick={() => setScheduleOpen(true)} className="cursor-pointer">
                          <CalendarClock className="w-4 h-4 mr-2 text-violet-600" />
                          Reschedule Guide
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleTransition("draft", { scheduledAt: null })}
                        disabled={togglingStatus}
                        className="cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                        Cancel Schedule (To Draft)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleTransition("archived")}
                        disabled={togglingStatus}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="w-4 h-4 mr-2 text-amber-600" />
                        Archive Guide
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* 3. PUBLISHED (NO Schedule Guide!) */}
                  {article.status === "published" && (
                    <>
                      {can("blogs.publish") && (
                        <DropdownMenuItem
                          onClick={() => handleTransition("draft")}
                          disabled={togglingStatus}
                          className="cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                          Unpublish to Draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleTransition("archived")}
                        disabled={togglingStatus}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="w-4 h-4 mr-2 text-amber-600" />
                        Archive Guide
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* 4. ARCHIVED */}
                  {article.status === "archived" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleTransition("draft")}
                        disabled={togglingStatus}
                        className="cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 mr-2 text-sky-600" />
                        Restore to Draft
                      </DropdownMenuItem>
                      {can("blogs.publish") && (
                        <DropdownMenuItem
                          onClick={() => handleTransition("published")}
                          disabled={togglingStatus}
                          className="cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                          Publish Live Now
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {can("blogs.delete") && (
                    <DropdownMenuItem
                      onClick={() => setDeleteModalOpen(true)}
                      className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Guide
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Tabs System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2">
          <TabsList className="h-10 justify-start overflow-x-auto bg-muted/60 p-1">
            <TabsTrigger value="content" className="text-xs px-3.5 h-8 font-medium">
              Content Preview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-3.5 h-8 font-medium">
              Analytics & Feedback
            </TabsTrigger>
            <TabsTrigger value="images" className="text-xs px-3.5 h-8 font-medium">
              Images ({allImages.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs px-3.5 h-8 font-medium">
              Links ({totalLinksCount})
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs px-3.5 h-8 font-medium">
              Video Guide ({article.videoUrl ? 1 : 0})
            </TabsTrigger>
          </TabsList>

          {/* Compact Language Selector Dropdown in Tabs Row */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Preview Language:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold border-violet-200 hover:border-violet-300 bg-violet-50/50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800"
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
                  <span>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === previewLang)?.label || "English"}
                  </span>
                  <ChevronDown className="w-3 h-3 ml-1.5 text-violet-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isAvailable = availableLangs.includes(lang.code);
                  const isSelected = previewLang === lang.code;
                  return (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => isAvailable && setPreviewLang(lang.code)}
                      disabled={!isAvailable}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md cursor-pointer ${
                        isSelected ? "bg-[#7552da] text-white font-semibold" : ""
                      } ${!isAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: CONTENT PREVIEW (Exact Vinimay 2-Column View) */}
        {/* ==================================================== */}
        <TabsContent value="content" className="space-y-6 pt-2">
          {previewLang !== "en" && (
            <div className="px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs text-violet-800 dark:text-violet-200 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <Globe className="w-4 h-4 text-violet-600" />
                Currently previewing in{" "}
                <strong>
                  {SUPPORTED_LANGUAGES.find((l) => l.code === previewLang)?.label}
                </strong>
                .
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewLang("en")}
                className="h-6 px-2 text-[11px] text-violet-700 hover:text-violet-900"
              >
                Reset to English
              </Button>
            </div>
          )}

          {/* 2-Column Container: Left Reading Paper + Right Sticky Contents Outline */}
          <div className="flex flex-col xl:flex-row items-start gap-8">
            {/* Left Column: Main Reading Paper Card */}
            <Card className="flex-1 min-w-0 border-border/80 shadow-xs overflow-hidden w-full">
              <CardContent className="p-6 lg:p-8">
                <div className="max-w-3xl space-y-7">
                  {/* Translated Title Banner when viewing non-English */}
                  {previewLang !== "en" && activeTranslation?.title && (
                    <div className="pb-3 border-b border-muted">
                      <h2 className="text-xl font-bold tracking-tight text-foreground">
                        {activeTranslation.title}
                      </h2>
                    </div>
                  )}

                  {/* 1. Overview (Clean text matching Vinimay Reader) */}
                  {displayOverview && !hasContentOverview && (
                    <section id="overview" className="scroll-mt-28 space-y-2">
                      <h2 className="text-[22px] font-bold text-foreground">Overview</h2>
                      <p className="text-[14.5px] sm:text-[15px] text-muted-foreground leading-[1.65]">
                        {displayOverview}
                      </p>
                    </section>
                  )}

                  {/* 2. Prerequisites / Why use this feature (Clean text matching Vinimay Reader) */}
                  {article.prerequisites && article.prerequisites.length > 0 && !hasContentPrerequisites && (
                    <section id="why-use-this-feature" className="scroll-mt-28 space-y-3">
                      <h2 className="text-[22px] font-bold text-foreground">
                        Why use this feature?
                      </h2>
                      <ul className="list-disc pl-5 space-y-2 text-[14.5px] sm:text-[15px] text-muted-foreground leading-relaxed">
                        {article.prerequisites.map((req, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {req}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* 3. Rich Editor Content HTML (if present) */}
                  {renderedContentHtml && (
                    <section id="article-content" className="scroll-mt-28 space-y-4 pt-1">
                      <div
                        className="prose prose-neutral dark:prose-invert max-w-none
                          [&>h2]:text-[22px] [&>h2]:sm:text-[24px] [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-8 [&>h2]:mb-3 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-border/50
                          [&>h3]:text-[17px] [&>h3]:sm:text-[18px] [&>h3]:font-bold [&>h3]:text-foreground [&>h3]:mt-6 [&>h3]:mb-2.5
                          [&>p]:text-muted-foreground [&>p]:leading-[1.65] [&>p]:text-[14.5px] [&>p]:sm:text-[15px] [&>p]:mb-4
                          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1.5 [&>ul>li]:text-muted-foreground [&>ul>li]:text-[14.5px]
                          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-2 [&>ol>li]:text-muted-foreground [&>ol>li]:text-[14.5px]
                          [&>blockquote]:border-l-4 [&>blockquote]:border-[#7552da] [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:my-4 [&>blockquote]:bg-[#7552da]/5 [&>blockquote]:rounded-r-xl [&>blockquote]:italic [&>blockquote]:text-muted-foreground
                          [&_img]:rounded-xl [&_img]:border [&_img]:border-border [&_img]:max-h-[460px] [&_img]:object-contain
                          [&_iframe]:w-full [&_iframe]:rounded-xl
                          [&_.kb-video-wrapper]:rounded-xl [&_.kb-video-wrapper]:overflow-hidden [&_.kb-video-wrapper]:my-6
                          [&_.kb-video-wrapper>div:first-child]:hidden
                          [&_.kb-edit-video-btn]:hidden [&_.kb-delete-video-btn]:hidden
                          [&_a]:text-[#7552da] [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
                      />
                    </section>
                  )}

                  {/* 4. Step-by-Step Instructions */}
                  {/* 4. Step-by-Step guide (Exact Vinimay layout) */}
                  {displaySteps && displaySteps.length > 0 && !hasContentSteps && (
                    <section id="step-by-step-guide" className="scroll-mt-28 space-y-4 pt-1">
                      <h2 className="text-[22px] sm:text-[24px] font-bold text-foreground">
                        Step-by-Step guide
                      </h2>

                      {/* Clean Numbered List (1. 2. 3. 4.) */}
                      <ol className="space-y-3.5 text-[14.5px] sm:text-[15px] text-muted-foreground leading-[1.65]">
                        {displaySteps.map((step, idx) => (
                          <li key={step.stepNumber || idx} className="flex items-start gap-2.5">
                            <span className="font-bold text-foreground shrink-0 text-[15px]">
                              {idx + 1}.
                            </span>
                            <div className="space-y-2 flex-1">
                              {step.title && (
                                <p className="font-semibold text-foreground text-[14.5px]">
                                  {step.title}
                                </p>
                              )}
                              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                {step.instruction}
                              </p>
                              {step.callout && step.callout.text && (
                                <div className="mt-1.5 px-3.5 py-2 rounded-xl bg-[#7552da]/5 border border-[#7552da]/20 text-[12.5px] text-[#5536b8] dark:text-violet-300 leading-relaxed flex items-start gap-1.5">
                                  <span className="font-bold shrink-0">Tip:</span>
                                  <span>{step.callout.text}</span>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>

                      {/* Product UI Screenshot Preview */}
                      {displaySteps.some((s) => s.imageUrl) && (
                        <div className="pt-2 space-y-4">
                          {displaySteps
                            .filter((s) => s.imageUrl)
                            .map((s, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="rounded-xl overflow-hidden border border-border shadow-2xs group relative bg-muted/10"
                              >
                                <img
                                  src={s.imageUrl}
                                  alt={s.title || "Step illustration"}
                                  className="w-full max-h-[460px] object-contain bg-card"
                                />
                                {s.title && (
                                  <div className="p-2.5 text-xs text-muted-foreground bg-muted/40 border-t border-border/50">
                                    {s.title}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* 5. Embedded Video Walkthrough (if attached) */}
                  {embedVideoUrl && (
                    <section id="video" className="scroll-mt-28 space-y-3 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                        <span>Video Walkthrough</span>
                      </div>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-xs bg-black">
                        <iframe
                          src={embedVideoUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </section>
                  )}

                  {/* 6. Frequently Asked Questions (Accordion) */}
                  {displayFaqs && displayFaqs.length > 0 && (
                    <section id="faqs" className="scroll-mt-28 space-y-4 pt-6 border-t border-border/50">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-[#7552da]" /> Frequently Asked Questions
                      </h3>

                      <div className="space-y-2.5">
                        {displayFaqs.map((faq, idx) => {
                          const isOpen = openFaqIndex === idx;
                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-border/70 overflow-hidden transition-colors hover:border-[#7552da]/40 cursor-pointer"
                              onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            >
                              <div className="p-4 flex items-center justify-between gap-4 bg-muted/20">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                                  <HelpCircle className="w-4 h-4 text-[#7552da] shrink-0" />
                                  <span>{faq.question}</span>
                                </h4>
                                <ChevronDown
                                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                              {isOpen && (
                                <div className="p-4 pt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-card">
                                  {faq.answer}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Sticky Table of Contents (Matching Vinimay Reader) */}
            <div className="hidden xl:block w-64 shrink-0 sticky top-28 space-y-3">
              <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#7552da]" />
                  Contents
                </h4>
                <nav className="space-y-1 text-[13px] border-l-2 border-border/60 pl-3">
                  {displayOverview && !hasContentOverview && (
                    <button
                      type="button"
                      onClick={() => scrollTo("overview")}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        activeSection === "overview"
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      Overview
                    </button>
                  )}

                  {article.prerequisites && article.prerequisites.length > 0 && !hasContentPrerequisites && (
                    <button
                      type="button"
                      onClick={() => scrollTo("why-use-this-feature")}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        activeSection === "why-use-this-feature"
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      Why use this feature?
                    </button>
                  )}

                  {/* Dynamic Headings from Rich Editor */}
                  {dynamicHeadings.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => scrollTo(h.id)}
                      title={h.text}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        h.level === "h3" ? "pl-2 text-xs" : "text-[13px]"
                      } ${
                        activeSection === h.id
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      {h.text}
                    </button>
                  ))}

                  {displaySteps && displaySteps.length > 0 && !hasContentSteps && (
                    <button
                      type="button"
                      onClick={() => scrollTo("step-by-step-guide")}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        activeSection === "step-by-step-guide"
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      Step-by-Step guide
                    </button>
                  )}

                  {embedVideoUrl && (
                    <button
                      type="button"
                      onClick={() => scrollTo("video")}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        activeSection === "video"
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      Video Walkthrough
                    </button>
                  )}

                  {displayFaqs && displayFaqs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => scrollTo("faqs")}
                      className={`w-full text-left py-1 transition-colors truncate block ${
                        activeSection === "faqs"
                          ? "text-[#7552da] font-bold"
                          : "text-muted-foreground hover:text-[#7552da]"
                      }`}
                    >
                      FAQ
                    </button>
                  )}
                </nav>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 2: ANALYTICS & FEEDBACK                         */}
        {/* ==================================================== */}
        <TabsContent value="analytics" className="space-y-6 pt-2">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-border/80">
              <span className="text-xs text-muted-foreground font-medium block">Total Guide Views</span>
              <p className="text-3xl font-bold text-foreground mt-1">
                {article.views || 0}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Accumulated reader visits
              </span>
            </Card>

            <Card className="p-5 border-border/80">
              <span className="text-xs text-muted-foreground font-medium block">Customer Satisfaction</span>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {feedbackStats.satisfaction !== null ? `${feedbackStats.satisfaction}%` : "—"}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {feedbackStats.total > 0 ? `${feedbackStats.total} total user ratings` : "No ratings yet"}
              </span>
            </Card>

            <Card className="p-5 border-border/80">
              <span className="text-xs text-muted-foreground font-medium block">Category Placement</span>
              <p className="text-xl font-bold text-foreground mt-1 truncate">
                {currentCategory?.name || article.categoryName}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Rank #{article.order || 1} in display order
              </span>
            </Card>
          </div>

          {/* Customer Feedback Breakdown */}
          <Card className="border-border/80">
            <CardHeader className="py-3 px-5 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-emerald-500" /> Reader Feedback Reactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="space-y-3 max-w-md">
                {/* Happy */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Smile className="w-4 h-4" /> Helpful & Satisfied
                    </span>
                    <span>{feedbackStats.happy} votes</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${
                          feedbackStats.total > 0
                            ? (feedbackStats.happy / feedbackStats.total) * 100
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Meh className="w-4 h-4" /> Neutral
                    </span>
                    <span>{feedbackStats.neutral} votes</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${
                          feedbackStats.total > 0
                            ? (feedbackStats.neutral / feedbackStats.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sad */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <Frown className="w-4 h-4" /> Needs Improvement
                    </span>
                    <span>{feedbackStats.sad} votes</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{
                        width: `${
                          feedbackStats.total > 0
                            ? (feedbackStats.sad / feedbackStats.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 3: IMAGES ({count}) - Matching Blogs Detail Tab  */}
        {/* ==================================================== */}
        <TabsContent value="images" className="space-y-4 pt-2">
          {allImages.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No images found</p>
              <p className="text-xs text-muted-foreground mt-1">
                This guide doesn't have any step screenshots or embedded images.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allImages.map((img, idx) => (
                <Card key={idx} className="border-border/80 overflow-hidden shadow-2xs group">
                  <div className="relative aspect-video bg-muted/20 overflow-hidden">
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxImg(img)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                    >
                      <Maximize2 className="w-4 h-4" /> View Full
                    </button>
                  </div>
                  <CardContent className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {img.caption}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {img.source}
                      </Badge>
                    </div>
                    {img.alt && (
                      <p className="text-[11px] text-muted-foreground truncate" title={img.alt}>
                        alt: "{img.alt}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 4: LINKS ({count}) - Matching Blogs Detail Tab   */}
        {/* ==================================================== */}
        <TabsContent value="links" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Internal Links */}
            <Card className="border-border/80">
              <CardHeader className="py-3 px-5 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-violet-600" />
                    Internal Links ({internalLinks.length})
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Vinimay Platform
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {internalLinks.length > 0 ? (
                  internalLinks.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-xs rounded-xl border border-border px-3 py-2.5 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <Link2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <span className="truncate font-medium text-foreground">{l.text}</span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          ({l.href})
                        </span>
                      </div>
                      <a
                        href={l.href.startsWith("http") ? l.href : getVinimayUrl(l.href)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7552da] hover:underline shrink-0"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No internal links detected in this guide.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* External Links */}
            <Card className="border-border/80">
              <CardHeader className="py-3 px-5 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-sky-600" />
                    External Links ({externalLinks.length})
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    External Resources
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {externalLinks.length > 0 ? (
                  externalLinks.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-xs rounded-xl border border-border px-3 py-2.5 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <ExternalLink className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        <span className="truncate font-medium text-foreground">{l.text}</span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          ({l.href})
                        </span>
                      </div>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline shrink-0"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No external links detected in this guide.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 5: VIDEO GUIDE (Walkthrough Player & Direct Link) */}
        {/* ==================================================== */}
        <TabsContent value="video" className="space-y-6 pt-2">
          {article.videoUrl ? (
            <div className="space-y-6 max-w-4xl">
              {/* Video Info Header Card */}
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          Video Walkthrough
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10.5px] font-semibold">
                            Attached & Active
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Embedded directly into the public Vinimay tutorial page for users.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {can("blogs.edit") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("kb-editor", { articleId: article.id })}
                          className="h-8 text-xs hover:border-[#7552da]/40 hover:text-[#7552da]"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Video Link
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(article.videoUrl, "_blank")}
                        className="h-8 text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Open in New Tab
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Link Row */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Video Link URL
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2 rounded-xl bg-muted/40 border border-border text-xs font-mono text-foreground truncate select-all">
                        {article.videoUrl}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyVideoUrl}
                        className="h-9 px-3 text-xs shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Copy URL
                      </Button>
                    </div>
                  </div>

                  {/* Player Embed */}
                  {embedVideoUrl ? (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Video Player Preview
                      </label>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-xs bg-black">
                        <iframe
                          src={embedVideoUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span>
                        This video link is not a standard embeddable format. Users can watch it directly by clicking "Open in New Tab".
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(article.videoUrl, "_blank")}
                        className="h-7 text-xs bg-white dark:bg-zinc-900"
                      >
                        Watch Video <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-border/80 shadow-xs max-w-2xl">
              <CardContent className="p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                  <Video className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">No Video Attached</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    This knowledge base article doesn't have an attached video walkthrough yet. Adding a YouTube tutorial helps users learn and master this feature faster.
                  </p>
                </div>
                {can("blogs.edit") && (
                  <Button
                    size="sm"
                    onClick={() => navigate("kb-editor", { articleId: article.id })}
                    className="bg-[#7552da] hover:bg-[#623fd0] text-white text-xs font-semibold"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Attach Video in Editor
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Lightbox Modal for Full Image View */}
      {lightboxImg && (
        <Dialog open={Boolean(lightboxImg)} onOpenChange={() => setLightboxImg(null)}>
          <DialogContent className="max-w-4xl p-2 bg-black/95 border-neutral-800 text-white">
            <div className="p-2 space-y-2">
              <img
                src={lightboxImg.src}
                alt={lightboxImg.alt}
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
              {lightboxImg.caption && (
                <p className="text-xs text-neutral-300 text-center pt-1 font-medium">
                  {lightboxImg.caption}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete Guide?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Are you sure you want to permanently delete <strong>"{article.title}"</strong>? This will remove it from the Vinimay Help Center.
          </p>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        blogTitle={article.title}
        status={article.status}
        scheduledAt={article.scheduledAt}
        onConfirm={async (iso) => {
          const scheduledAt = typeof iso === "string" ? iso : iso?.scheduledAt;
          setScheduleOpen(false);
          try {
            await api.put(`/kb/articles/${article.id}`, {
              status: "scheduled",
              scheduledAt,
            });
            toast.success("Guide scheduled successfully!");
            mutate();
          } catch (err) {
            toast.error(err.message || "Failed to schedule guide");
          }
        }}
      />
    </div>
  );
}
