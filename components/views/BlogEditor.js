"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  Link2Off,
  Image as ImageIcon,
  Table,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Save,
  Eye,
  CalendarClock,
  Globe,
  Rocket,
  Eraser,
  Lightbulb,
  Replace,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Braces,
  Type as TypeIcon,
  FileText,
  ExternalLink,
  BookmarkPlus,
  Wand2,
  Loader2,
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  Moon,
  Sparkles,
  Gauge,
  ListTree,
  ChevronRight,
  Clock,
  X,
  Plus,
  Hash,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  fetcher,
  fmtNum,
  timeAgo,
  TIME_AGO_SHORT,
  TIMEZONES,
  STATUS_META,
} from "@/lib/client";
import { analyzeSeo, slugify } from "@/lib/seo";
import {
  ScoreRing,
  ChipInput,
  Labeled,
  CharCount,
  CheckItem,
  ConfirmDialog,
} from "../bits";

// ---------- helpers ----------

function renderFigure(url, alt, caption, width, align) {
  let style = "";
  if (width) style += "width:" + width + "%;";
  if (align === "center") style += "margin-left:auto;margin-right:auto;";
  if (align === "left") style += "float:left;margin:0 18px 12px 0;";
  if (align === "right") style += "float:right;margin:0 0 12px 18px;";
  return (
    '<figure><img src="' +
    url +
    '" alt="' +
    (alt || "") +
    '" style="' +
    style +
    '" />' +
    (caption ? "<figcaption>" + caption + "</figcaption>" : "") +
    "</figure>"
  );
}

function stripToText(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kwMetrics(keyword, keywords) {
  if (!keyword) return null;
  const found = (keywords || []).find(
    (k) => k.keyword.toLowerCase() === keyword.toLowerCase(),
  );
  if (found)
    return {
      volume: found.volume,
      difficulty: found.difficulty,
      position: found.position,
      estimated: false,
    };
  let h = 0;
  for (const c of keyword) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return {
    volume: 400 + (h % 7000),
    difficulty: 20 + (h % 70),
    position: 5 + (h % 30),
    estimated: true,
  };
}

const emptyForm = () => ({
  title: "",
  slug: "",
  slugEdited: false,
  category: "",
  subcategory: "",
  author: "",
  tags: [],
  featuredImage: { url: "", alt: "", title: "", caption: "" },
  contentHtml: "",
  seo: {
    metaTitle: "",
    metaDescription: "",
    canonical: "",
    robots: { index: true, follow: true },
    focusKeyword: "",
    secondaryKeywords: [],
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
  },
  brief: {
    targetKeyword: "",
    intent: "Informational",
    audience: "",
    contentType: "Guide",
    wordCount: 1200,
    competitorUrls: [],
    questions: "",
    requiredHeadings: "",
    internalLinks: [],
    externalRefs: "",
  },
  savedSuggestions: [],
  status: "draft",
  scheduledAt: null,
  publishedAt: null,
});

// ---------- main ----------
export default function BlogEditor({ blogId, navigate, can, user, focus }) {
  const isEdit = !!blogId;
  const [id, setId] = useState(blogId);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(isEdit);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [tab, setTab] = useState("seo");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [imgDialog, setImgDialog] = useState(null); // {mode:'content'|'featured'}
  const [picker, setPicker] = useState(null); // 'og' | 'twitter' | 'pick-featured'
  const openPicker = (s) => {
    if (s && s.target) setPicker(s.target);
    else setImgDialog(s);
  };
  const [linkDialog, setLinkDialog] = useState(null); // {url, text, newTab}
  const [dismissed, setDismissed] = useState([]);
  const [outline, setOutline] = useState(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [imgBar, setImgBar] = useState(null); // selected img element info
  const [highlight, setHighlight] = useState(null);
  const [seoSheetOpen, setSeoSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const fileRef = useRef(null);
  const fileMode = useRef("content");

  const { data: team } = useSWR("/api/team", fetcher);
  const { data: allBlogs } = useSWR("/api/blogs?limit=100", fetcher);
  const { data: keywords } = useSWR("/api/keywords", fetcher);
  const { data: contentOptions } = useSWR("/api/content-options", fetcher);
  const categories = contentOptions?.categories || [];
  const subcategories = contentOptions?.subcategories || [];
  const subcategoryRelations = contentOptions?.subcategoryRelations || [];
  const relatedSubcategories = useMemo(() => {
    if (!form.category || !subcategoryRelations.length) return subcategories;
    const related = subcategoryRelations
      .filter((item) => item.category === form.category)
      .map((item) => item.subcategory);
    return related.length ? related : subcategories;
  }, [form.category, subcategories, subcategoryRelations]);

  // Load blog
  useEffect(() => {
    if (!id) {
      setForm((f) => ({ ...f, author: user?.name || "" }));
      setLoading(false);
      return;
    }
    setLoading(true);
    api("/blogs/" + id)
      .then((b) => {
        setForm({
          title: b.title || "",
          slug: b.slug || "",
          slugEdited: true,
          category: b.category || "",
          subcategory: b.subcategory || "",
          author: b.author || "",
          tags: b.tags || [],
          featuredImage: b.featuredImage || {
            url: "",
            alt: "",
            title: "",
            caption: "",
          },
          contentHtml: b.contentHtml || "",
          seo: Object.assign(emptyForm().seo, b.seo || {}),
          brief: Object.assign(emptyForm().brief, b.brief || {}),
          savedSuggestions: b.savedSuggestions || [],
          status: b.status,
          scheduledAt: b.scheduledAt,
          publishedAt: b.publishedAt,
        });
        setLastSaved(b.updatedAt);
        if (focus) {
          const map = {
            meta: "meta",
            seo: "seo",
            links: "links",
            title: "seo",
          };
          setTab(map[focus] || "seo");
          if (focus === "content")
            setTimeout(
              () =>
                editorRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                }),
              400,
            );
          if (focus === "media") setHighlight("featured");
          setTimeout(() => setHighlight(null), 2600);
        }
      })
      .catch(() => toast.error("Could not load this blog"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Put initial HTML into the editor once loaded
  useEffect(() => {
    if (
      !loading &&
      editorRef.current &&
      editorRef.current.dataset.init !== "1"
    ) {
      editorRef.current.innerHTML = form.contentHtml || "";
      editorRef.current.dataset.init = "1";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const analysis = useMemo(
    () =>
      analyzeSeo({
        ...form,
        seo: { ...form.seo, metaTitle: form.seo.metaTitle || form.title },
      }),
    [form],
  );
  const wc = analysis.stats.words;

  // Autosave
  useEffect(() => {
    if (!dirty || !id || saving) return;
    const t = setTimeout(() => {
      save(true);
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  const up = (patch) => {
    setForm((f) => ({
      ...f,
      ...(typeof patch === "function" ? patch(f) : patch),
    }));
    setDirty(true);
  };
  const upSeo = (patch) => up((f) => ({ seo: { ...f.seo, ...patch } }));

  async function save(silent) {
    if (!can("blogs.edit") && isEdit) {
      toast.error("Your role cannot edit blogs.");
      return;
    }
    if (!can("blogs.create") && !isEdit) {
      toast.error("Your role cannot create blogs.");
      return;
    }
    if (!form.title.trim()) {
      if (!silent) toast.error("Please add a title first");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        category: form.category,
        subcategory: form.subcategory,
        author: form.author || user?.name,
        tags: form.tags,
        featuredImage: form.featuredImage,
        contentHtml: editorRef.current
          ? editorRef.current.innerHTML
          : form.contentHtml,
        seo: { ...form.seo, metaTitle: form.seo.metaTitle || form.title },
        brief: form.brief,
        savedSuggestions: form.savedSuggestions,
      };
      if (id) {
        const b = await api("/blogs/" + id, { method: "PUT", body: payload });
        setLastSaved(b.updatedAt);
        setForm((f) => ({ ...f, slug: b.slug }));
        return b.id;
      } else {
        const b = await api("/blogs", { method: "POST", body: payload });
        setId(b.id);
        idRef.current = b.id;
        setLastSaved(b.updatedAt);
        window.history.replaceState(null, "", "?id=" + b.id);
        window.dispatchEvent(new Event("ss-refresh"));
        return b.id;
      }
      setDirty(false);
      if (!silent)
        toast.success(
          isEdit ? "Blog saved successfully" : "Draft created successfully",
        );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function transition(to, scheduledAt) {
    const savedId = await save(true);
    const bid = savedId || idRef.current || id;
    if (!bid) {
      toast.error("Add a title first");
      return;
    }
    try {
      const b = await api("/blogs/" + bid + "/transition", {
        method: "POST",
        body: { to, scheduledAt },
      });
      up({
        status: b.status,
        scheduledAt: b.scheduledAt,
        publishedAt: b.publishedAt,
      });
      setDirty(false);
      window.dispatchEvent(new Event("ss-refresh"));
      if (to === "published") {
        toast.success("Blog published successfully 🎉");
      }
      if (to === "scheduled")
        toast.success(
          "Blog scheduled for " +
            (scheduledAt ? new Date(scheduledAt).toLocaleString() : "later"),
        );
      if (to === "in_review") toast.success("Submitted for SEO review");
    } catch (e) {
      toast.error(e.message);
    }
  }

  const idRef = useRef(null);
  useEffect(() => {
    idRef.current = id;
  }, [id]);

  // ---- editor helpers ----
  function exec(cmd, val) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand(cmd, false, val || null);
    savedRange.current = null;
    onEdit();
  }

  function onEdit() {
    setDirty(true);
    setForm((f) => ({
      ...f,
      contentHtml: editorRef.current
        ? editorRef.current.innerHTML
        : f.contentHtml,
    }));
  }

  function saveSel() {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current &&
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function insertHTML(html) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
      savedRange.current = null;
    } else {
      const sel2 = window.getSelection();
      if (sel2 && sel2.rangeCount === 0) {
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel2.addRange(r);
      }
    }
    document.execCommand("insertHTML", false, html);
    onEdit();
  }

  // image selection inside editor
  function handleEditorClick(e) {
    const img = e.target.closest && e.target.closest("img");
    if (editorRef.current)
      editorRef.current
        .querySelectorAll("img.ss-img-selected")
        .forEach((i) => i.classList.remove("ss-img-selected"));
    if (img && editorRef.current.contains(img)) {
      img.classList.add("ss-img-selected");
      const fig = img.closest("figure");
      setImgBar({
        img,
        fig,
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        caption: fig
          ? (fig.querySelector("figcaption") || {}).textContent || ""
          : "",
      });
    } else setImgBar(null);
  }

  function updateSelectedImg(mut) {
    const bar = imgBar;
    if (!bar) return;
    mut(bar);
    onEdit();
  }

  async function uploadFiles(files, mode) {
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) {
        // compute dimensions client-side
        if (f.type.startsWith("image/")) {
          const dims = await new Promise((res) => {
            const img = new Image();
            img.onload = () =>
              res({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => res({ w: 0, h: 0 });
            img.src = URL.createObjectURL(f);
          });
          fd.append("width", dims.w);
          fd.append("height", dims.h);
        }
        fd.append("files", f);
      }
      fd.append(
        "folder",
        mode === "featured" ? "Featured Images" : "Blog Images",
      );
      const created = await api("/upload", {
        method: "POST",
        body: fd,
        raw: true,
      });
      return created;
    } catch (e) {
      toast.error(e.message || "Upload failed");
      return [];
    } finally {
      setUploading(false);
    }
  }

  async function handleFeaturedFiles(files) {
    const created = await uploadFiles(files, "featured");
    if (created.length) {
      const c = created[0];
      up({
        featuredImage: {
          url: c.url,
          storage: c.storage,
          publicId: c.publicId,
          alt: form.featuredImage.alt || c.alt,
          title: c.name,
          caption: "",
        },
      });
      toast.success("Image uploaded successfully");
    }
  }

  async function optimizeFeatured(mode) {
    const url = form.featuredImage.url;
    const uploadedImage =
      form.featuredImage.storage === "cloudinary" ||
      url.startsWith("/uploads/");
    if (!url || !uploadedImage) {
      toast.error("Replace with an uploaded file first to optimize it");
      return;
    }
    try {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const quality = mode === "compress" ? 0.72 : 0.85;
      const blob = await new Promise((res) =>
        canvas.toBlob(res, "image/webp", quality),
      );
      const file = new File(
        [blob],
        (form.featuredImage.title || "image").replace(/\.[^.]+$/, "") + ".webp",
        { type: "image/webp" },
      );
      const created = await uploadFiles([file], "featured");
      if (created.length) {
        up({ featuredImage: { ...form.featuredImage, url: created[0].url } });
        toast.success(
          mode === "compress"
            ? "Image compressed — new size " +
                Math.round(blob.length / 1024) +
                " KB"
            : "Converted to WebP — " + Math.round(blob.length / 1024) + " KB",
        );
      }
    } catch (e) {
      toast.error("Could not process this image");
    }
  }

  // Internal link suggestions
  const suggestions = useMemo(() => {
    const me = id;
    const kw = (form.seo.focusKeyword || form.title).toLowerCase();
    const words = kw.split(/\s+/).filter((w) => w.length > 3);
    return (allBlogs?.items || [])
      .filter((b) => b.id !== me)
      .map((b) => {
        const hay = (
          b.title +
          " " +
          (b.seo?.focusKeyword || "") +
          " " +
          (b.tags || []).join(" ")
        ).toLowerCase();
        const hits = words.filter((w) => hay.includes(w)).length;
        const relevance = words.length
          ? Math.min(97, Math.round((hits / words.length) * 100) + 42)
          : 50;
        return { id: b.id, title: b.title, url: "/blog/" + b.slug, relevance };
      })
      .filter((s) => !dismissed.includes(s.id))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }, [allBlogs, form.seo.focusKeyword, form.title, id, dismissed]);

  // TOC from content
  const toc = useMemo(() => {
    const items = [];
    const re = /<h([12])[^>]*>(.*?)<\/h\1>/gi;
    let m;
    while ((m = re.exec(form.contentHtml || "")) !== null) {
      items.push({
        level: +m[1],
        text: stripToText(m[2]) || "Untitled section",
      });
    }
    return items;
  }, [form.contentHtml]);

  const jumpTo = (idx) => {
    const hs = editorRef.current
      ? editorRef.current.querySelectorAll("h1, h2, h3")
      : [];
    const el = hs[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.style.transition = "background .8s";
      el.style.background = "hsl(262 83% 58% / 0.12)";
      setTimeout(() => {
        el.style.background = "";
      }, 1200);
    }
  };

  // Publish checklist
  const checklist = useMemo(
    () => [
      {
        label: "Title",
        ok: !!(form.title || "").trim(),
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            const el = document.getElementById("f-title");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 120);
        },
      },
      {
        label: "Content (150+ words)",
        ok: (wc || 0) >= 150,
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            editorRef.current?.focus();
          }, 120);
        },
      },
      {
        label: "Featured image",
        ok: !!form.featuredImage?.url,
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            document
              .getElementById("featured-card")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        },
      },
      {
        label: "SEO title",
        ok: !!(form.seo?.metaTitle || form.title || "").trim(),
        fix: () => {
          setChecklistOpen(false);
          setTab("meta");
          setSeoSheetOpen(true);
          setTimeout(() => {
            const el = document.getElementById("f-seo-title");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 150);
        },
      },
      {
        label: "Meta description",
        ok: (form.seo?.metaDescription || "").length >= 120,
        fix: () => {
          setChecklistOpen(false);
          setTab("meta");
          setSeoSheetOpen(true);
          setTimeout(() => {
            const el = document.getElementById("f-meta-description");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 150);
        },
      },
      {
        label: "URL slug",
        ok: !!(form.slug || "").trim(),
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            const el = document.getElementById("f-slug");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 120);
        },
      },
      {
        label: "Focus keyword",
        ok: !!(form.seo?.focusKeyword || "").trim(),
        fix: () => {
          setChecklistOpen(false);
          setTab("seo");
          setSeoSheetOpen(true);
          setTimeout(() => {
            const el = document.getElementById("f-focus-keyword");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 150);
        },
      },
      {
        label: "Featured image alt text",
        ok: !!(form.featuredImage?.alt || "").trim(),
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            const el = document.getElementById("f-featured-alt");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus();
            } else {
              document
                .getElementById("featured-card")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 120);
        },
      },
      {
        label: "Author",
        ok: !!form.author,
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            const el = document.getElementById("f-author");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 120);
        },
      },
      {
        label: "Category",
        ok: !!form.category,
        fix: () => {
          setChecklistOpen(false);
          setTimeout(() => {
            const el = document.getElementById("f-category");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 120);
        },
      },
    ],
    [form, wc],
  );
  const checklistOk = checklist.every((c) => c.ok);

  async function generateOutline() {
    setOutlineLoading(true);
    try {
      const o = await api("/generate-outline", {
        method: "POST",
        body: {
          keyword:
            form.brief.targetKeyword || form.seo.focusKeyword || form.title,
          contentType: form.brief.contentType,
          wordCount: form.brief.wordCount,
          intent: form.brief.intent,
        },
      });
      setOutline(o);
    } catch (e) {
      toast.error("Could not generate structure");
    } finally {
      setOutlineLoading(false);
    }
  }

  function applyOutline() {
    if (!outline) return;
    let html =
      "<h2>" +
      outline.h2s[0].h2 +
      "</h2><p>Start with a clear definition of " +
      (form.brief.targetKeyword || "the topic") +
      "…</p>";
    html +=
      "<h2>" +
      outline.h2s[1].h2 +
      "</h2>" +
      outline.h2s[1].h3s.map((h) => "<h3>" + h + "</h3><p>…</p>").join("");
    html +=
      "<h2>" +
      outline.h2s[2].h2 +
      "</h2>" +
      outline.h2s[2].h3s.map((h) => "<h3>" + h + "</h3><p>…</p>").join("");
    html +=
      "<h2>" +
      outline.h2s[4].h2 +
      "</h2>" +
      outline.questions
        .slice(0, 3)
        .map((q) => "<h3>" + q + "</h3><p>Answer…</p>")
        .join("");
    insertHTML(html);
    toast.success("Structure applied to the editor");
  }

  async function generateSeoMetaWithAi() {
    if (!form.title && !form.seo.focusKeyword && !form.contentHtml) {
      toast.error("Please provide a title, focus keyword, or content first.");
      return;
    }
    setGeneratingMeta(true);
    try {
      const res = await api("/generate-seo-meta", {
        method: "POST",
        body: {
          title: form.title,
          keyword: form.seo.focusKeyword || form.brief.targetKeyword,
          contentHtml: form.contentHtml,
        },
      });
      if (res.metaTitle || res.metaDescription) {
        upSeo({
          metaTitle: res.metaTitle || form.seo.metaTitle,
          metaDescription: res.metaDescription || form.seo.metaDescription,
          secondaryKeywords: Array.from(
            new Set([
              ...(form.seo.secondaryKeywords || []),
              ...(res.suggestedKeywords || []),
            ]),
          ),
          ogTitle: res.metaTitle || form.seo.ogTitle,
          ogDescription: res.metaDescription || form.seo.ogDescription,
          twitterTitle: res.metaTitle || form.seo.twitterTitle,
          twitterDescription: res.metaDescription || form.seo.twitterDescription,
        });
        toast.success("SEO Metadata generated with Gemini AI!");
      }
    } catch (e) {
      toast.error(e.message || "Could not generate SEO metadata");
    } finally {
      setGeneratingMeta(false);
    }
  }

  const ToolBtn = ({ onClick, active, title, children, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      className={
        "h-8 min-w-8 px-1.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 " +
        (active
          ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          : "")
      }
    >
      {children}
    </button>
  );

  const [activeStates, setActiveStates] = useState({});
  useEffect(() => {
    const h = () => {
      try {
        setActiveStates({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
          insertUnorderedList: document.queryCommandState(
            "insertUnorderedList",
          ),
          insertOrderedList: document.queryCommandState("insertOrderedList"),
        });
      } catch (e) {}
    };
    document.addEventListener("selectionchange", h);
    return () => document.removeEventListener("selectionchange", h);
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const statusMeta = STATUS_META[form.status] || STATUS_META.draft;
  const savingLabel = saving
    ? "Saving…"
    : lastSaved
      ? "Saved " + TIME_AGO_SHORT(lastSaved)
      : "Not saved yet";

  const rail = (
    <EditorRail
      tab={tab}
      setTab={setTab}
      analysis={analysis}
      form={form}
      up={up}
      upSeo={upSeo}
      keywords={keywords}
      toc={toc}
      jumpTo={jumpTo}
      suggestions={suggestions}
      insertSuggestion={(s) =>
        setLinkDialog({ url: s.url, text: s.title, fromSuggestion: true })
      }
      dismissSuggestion={(s) => {
        setDismissed((d) => [...d, s.id]);
        toast("Suggestion ignored");
      }}
      saveSuggestion={(s) => {
        up({
          savedSuggestions: [
            ...form.savedSuggestions,
            { title: s.title, url: s.url },
          ],
        });
        toast.success("Saved for later");
      }}
      outline={outline}
      outlineLoading={outlineLoading}
      generateOutline={generateOutline}
      applyOutline={applyOutline}
      generatingMeta={generatingMeta}
      generateSeoMetaWithAi={generateSeoMetaWithAi}
      highlight={highlight}
      setImgDialog={openPicker}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("blogs", {})}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight truncate max-w-[280px] sm:max-w-md">
                {isEdit ? form.title || "Edit Blog" : "Create New Blog"}
              </h1>
              <Badge
                variant="outline"
                className={"text-[11px] " + statusMeta.cls}
              >
                {statusMeta.label}
              </Badge>
            </div>
            <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
              {savingLabel} · SEO score {analysis.score}/100
            </p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => save(false)}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                save(true).then(() => setPreviewOpen(true));
              }}
            >
              <Eye className="h-4 w-4 mr-1.5" />{" "}
              <span className="hidden sm:inline">Preview</span>
            </Button>
            {can("blogs.schedule") && form.status !== "published" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarClock className="h-4 w-4 mr-1.5" />{" "}
                <span className="hidden sm:inline">Schedule</span>
              </Button>
            )}
            {can("blogs.publish") ? (
              <Button
                size="sm"
                className="h-9 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-md shadow-violet-500/25"
                onClick={() => {
                  setChecklistOpen(true);
                }}
              >
                <Rocket className="h-4 w-4 mr-1.5" />{" "}
                <span className="hidden sm:inline">Publish</span>
              </Button>
            ) : (
              can("blogs.edit") &&
              form.status === "draft" && (
                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => transition("in_review")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5 rotate-180" /> Submit for
                  review
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main column */}
        <div className="flex-1 min-w-0 px-4 lg:px-8 py-6 space-y-5 max-w-[860px] mx-auto xl:mx-0 xl:ml-[max(2rem,calc(50%-560px))]">
          {/* Blog information */}
          <Card
            id="info-card"
            className={
              highlight === "featured"
                ? "ring-2 ring-amber-300 dark:ring-amber-700"
                : ""
            }
          >
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Blog information</h2>
                <Badge
                  variant="outline"
                  className="text-[11px] text-muted-foreground font-normal"
                >
                  Required fields are marked *
                </Badge>
              </div>

              <div className="space-y-2">
                <Labeled label="Blog title" required htmlFor="f-title">
                  <div className="relative">
                    <Input
                      id="f-title"
                      value={form.title}
                      onChange={(e) =>
                        up({
                          title: e.target.value,
                          slug: form.slugEdited
                            ? form.slug
                            : slugify(e.target.value),
                        })
                      }
                      placeholder="Enter your blog title…"
                      className="text-[16px] font-medium h-11"
                      maxLength={140}
                    />
                  </div>
                </Labeled>
                <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground pl-0.5">
                  <span
                    className={
                      "font-medium " +
                      (form.title.length >= 30 && form.title.length <= 65
                        ? "text-emerald-600"
                        : "")
                    }
                  >
                    {form.title.length} characters
                  </span>
                  <span>·</span>
                  <span>Ideal: 30–65 characters</span>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    SEO title preview
                  </p>
                  <p className="text-[15px] font-semibold text-primary truncate">
                    {form.seo.metaTitle ||
                      form.title ||
                      "Your SEO optimized blog title"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Labeled label="URL slug">
                  <div className="flex items-center rounded-md border border-input bg-muted/30 shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
                    <span className="pl-3 text-[13px] text-muted-foreground select-none">
                      /blog/
                    </span>
                    <Input
                      id="f-slug"
                      value={form.slug}
                      onChange={(e) =>
                        up({ slug: slugify(e.target.value), slugEdited: true })
                      }
                      placeholder="your-blog-slug"
                      className="border-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </Labeled>
                <Labeled label="Author" required>
                  <Select
                    value={form.author || ""}
                    onValueChange={(v) => up({ author: v })}
                  >
                    <SelectTrigger id="f-author" className="bg-muted/30">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      {(team || [])
                        .filter((m) => m.status === "active")
                        .map((m) => (
                          <SelectItem key={m.id} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Labeled>
                <Labeled label="Category" required>
                  <Select
                    value={form.category || ""}
                    onValueChange={(v) =>
                      up({
                        category: v,
                        subcategory: relatedSubcategories.includes(
                          form.subcategory,
                        )
                          ? form.subcategory
                          : "",
                      })
                    }
                  >
                    <SelectTrigger id="f-category" className="bg-muted/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
                <Labeled label="Subcategory">
                  <Select
                    value={form.subcategory || ""}
                    onValueChange={(v) => up({ subcategory: v })}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {relatedSubcategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>

              <Labeled label="Tags" hint="Press Enter to add">
                <ChipInput
                  value={form.tags}
                  onChange={(tags) => up({ tags })}
                  placeholder="e.g. technical seo, guides…"
                />
              </Labeled>

              {/* Featured image */}
              <div id="featured-card" className="space-y-3">
                <Labeled
                  label="Featured image"
                  required={!form.featuredImage.url}
                >
                  {!form.featuredImage.url ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFeaturedFiles(e.dataTransfer.files);
                      }}
                      onClick={() => {
                        fileMode.current = "featured";
                        fileRef.current?.click();
                      }}
                      className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/20 py-10 cursor-pointer hover:border-violet-400 hover:bg-violet-50/70 transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-violet-400" />
                      )}
                      <p className="text-sm font-medium">
                        Drag &amp; drop an image, or{" "}
                        <span className="text-violet-600 underline">
                          browse files
                        </span>
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        PNG, JPG or WebP — up to 5MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative group rounded-xl overflow-hidden border border-border">
                        <img
                          src={form.featuredImage.url}
                          alt={form.featuredImage.alt}
                          className="w-full h-56 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              fileMode.current = "featured";
                              fileRef.current?.click();
                            }}
                          >
                            <Replace className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              up({
                                featuredImage: {
                                  url: "",
                                  alt: "",
                                  title: "",
                                  caption: "",
                                },
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      {/* Image optimization panel */}
                      <FeaturedMeta
                        form={form}
                        up={up}
                        optimizeFeatured={optimizeFeatured}
                        setImgDialog={openPicker}
                      />
                    </div>
                  )}
                </Labeled>
              </div>
            </CardContent>
          </Card>

          {/* Content editor */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-[15px] font-semibold">Content</h2>
                <span className="text-[11.5px] text-muted-foreground">
                  {wc} words · {Math.max(1, Math.round(wc / 220))} min read
                </span>
              </div>
              {/* Toolbar */}
              <div className="sticky top-16 z-20 bg-card/95 backdrop-blur border border-border rounded-lg mx-4 mt-3 px-2 py-1.5 flex flex-wrap items-center gap-0.5 shadow-sm">
                <ToolBtn
                  title="Paragraph"
                  onClick={() => exec("formatBlock", "<p>")}
                >
                  <Pilcrow className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Heading 1"
                  onClick={() => exec("formatBlock", "<h1>")}
                >
                  <span className="text-[13px] font-bold">H1</span>
                </ToolBtn>
                <ToolBtn
                  title="Heading 2"
                  onClick={() => exec("formatBlock", "<h2>")}
                >
                  <Heading2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Heading 3"
                  onClick={() => exec("formatBlock", "<h3>")}
                >
                  <Heading3 className="h-4 w-4" />
                </ToolBtn>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <ToolBtn
                  title="Bold"
                  active={activeStates.bold}
                  onClick={() => exec("bold")}
                >
                  <Bold className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Italic"
                  active={activeStates.italic}
                  onClick={() => exec("italic")}
                >
                  <Italic className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Underline"
                  active={activeStates.underline}
                  onClick={() => exec("underline")}
                >
                  <Underline className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Strikethrough"
                  active={activeStates.strikeThrough}
                  onClick={() => exec("strikeThrough")}
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolBtn>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <ToolBtn
                  title="Bullet list"
                  active={activeStates.insertUnorderedList}
                  onClick={() => exec("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Numbered list"
                  active={activeStates.insertOrderedList}
                  onClick={() => exec("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Blockquote"
                  onClick={() => exec("formatBlock", "<blockquote>")}
                >
                  <Quote className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Code block"
                  onClick={() => exec("formatBlock", "<pre>")}
                >
                  <Code2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Callout"
                  onClick={() =>
                    insertHTML(
                      '<div class="callout"><span class="callout-icon">💡</span><div><strong>Pro tip.</strong> Share an expert insight here…</div></div><p></p>',
                    )
                  }
                >
                  <Lightbulb className="h-4 w-4" />
                </ToolBtn>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <ToolBtn
                  title="Insert link"
                  onClick={() => {
                    saveSel();
                    setLinkDialog({ url: "", text: "", newTab: true });
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Remove link" onClick={() => exec("unlink")}>
                  <Link2Off className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Insert image"
                  onClick={() => {
                    saveSel();
                    setImgDialog({ mode: "content" });
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Insert table"
                  onClick={() =>
                    insertHTML(
                      "<table><tbody>" +
                        Array.from({ length: 3 })
                          .map(
                            () =>
                              "<tr>" +
                              Array.from({ length: 3 })
                                .map(() => "<td>&nbsp;</td>")
                                .join("") +
                              "</tr>",
                          )
                          .join("") +
                        "</tbody></table><p></p>",
                    )
                  }
                >
                  <Table className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Divider"
                  onClick={() => exec("insertHorizontalRule")}
                >
                  <Minus className="h-4 w-4" />
                </ToolBtn>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <ToolBtn title="Align left" onClick={() => exec("justifyLeft")}>
                  <AlignLeft className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Align center"
                  onClick={() => exec("justifyCenter")}
                >
                  <AlignCenter className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  title="Align right"
                  onClick={() => exec("justifyRight")}
                >
                  <AlignRight className="h-4 w-4" />
                </ToolBtn>
                <Separator orientation="vertical" className="h-5 mx-0.5" />
                <ToolBtn
                  title="Clear formatting"
                  onClick={() => exec("removeFormat")}
                >
                  <Eraser className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Undo" onClick={() => exec("undo")}>
                  <Undo2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Redo" onClick={() => exec("redo")}>
                  <Redo2 className="h-4 w-4" />
                </ToolBtn>
              </div>

              {/* Image options bar */}
              {imgBar && (
                <div className="mx-4 mt-2 rounded-lg border border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/30 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                  <ImageIcon className="h-4 w-4 text-violet-500" />
                  <span className="font-semibold">Image selected</span>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      saveSel();
                      setImgDialog({ mode: "edit-image", img: imgBar });
                    }}
                  >
                    Alt &amp; caption
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        b.img.style.float = "";
                        b.img.style.margin = "0 auto";
                        b.img.style.display = "block";
                      })
                    }
                  >
                    Center
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        b.img.style.float = "left";
                        b.img.style.margin = "0 18px 12px 0";
                      })
                    }
                  >
                    Float left
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        b.img.style.float = "right";
                        b.img.style.margin = "0 0 12px 18px";
                      })
                    }
                  >
                    Float right
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        b.img.style.width = "50%";
                      })
                    }
                  >
                    50%
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        b.img.style.width = "100%";
                      })
                    }
                  >
                    100%
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-rose-600"
                    onClick={() =>
                      updateSelectedImg((b) => {
                        (b.fig || b.img).remove();
                        setImgBar(null);
                      })
                    }
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs ml-auto"
                    onClick={() => {
                      editorRef.current
                        .querySelectorAll("img.ss-img-selected")
                        .forEach((i) => i.classList.remove("ss-img-selected"));
                      setImgBar(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div
                ref={editorRef}
                className="editor-area prose-studio px-6 lg:px-8"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start writing your blog… Select text to format. Drop images anywhere in the article."
                onInput={onEdit}
                onClick={handleEditorClick}
                onBlur={saveSel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []).filter(
                    (f) => f.type.startsWith("image/"),
                  );
                  if (!files.length) return;
                  const created = await uploadFiles(files, "content");
                  created.forEach((c) =>
                    insertHTML(
                      renderFigure(c.url, c.alt || c.name, "", 100, "center"),
                    ),
                  );
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right rail (desktop) */}
        <div className="hidden xl:block w-[400px] shrink-0 px-4 lg:px-6 py-6">
          <div className="sticky top-24">{rail}</div>
        </div>
      </div>

      {/* Mobile SEO sheet trigger */}
      <button
        onClick={() => setSeoSheetOpen(true)}
        className="xl:hidden fixed bottom-20 right-4 z-40 h-12 px-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30 flex items-center gap-2 text-sm font-semibold"
      >
        <Gauge className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> SEO
        · {analysis.score}
      </button>
      <Sheet open={seoSheetOpen} onOpenChange={setSeoSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 overflow-hidden"
        >
          <div className="h-full overflow-y-auto">{rail}</div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = Array.from(e.target.files || []);
          if (fileMode.current === "featured") handleFeaturedFiles(f);
          e.target.value = "";
        }}
      />

      {/* Link dialog */}
      <Dialog
        open={!!linkDialog}
        onOpenChange={(o) => !o && setLinkDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkDialog?.fromSuggestion
                ? "Insert internal link"
                : "Add a link"}
            </DialogTitle>
            <DialogDescription>
              {linkDialog?.fromSuggestion
                ? "Suggested based on this blog\u2019s topic and keywords."
                : "Link to an internal page or an external resource."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Labeled label="Link text">
              <Input
                value={linkDialog?.text || ""}
                onChange={(e) =>
                  setLinkDialog({ ...linkDialog, text: e.target.value })
                }
                placeholder="Anchor text"
              />
            </Labeled>
            <Labeled label="URL">
              <Input
                value={linkDialog?.url || ""}
                onChange={(e) =>
                  setLinkDialog({ ...linkDialog, url: e.target.value })
                }
                placeholder="/blog/slug or https://…"
              />
            </Labeled>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!linkDialog?.url) {
                  toast.error("Please add a URL");
                  return;
                }
                const text = linkDialog.text || linkDialog.url;
                exec("createLink", linkDialog.url);
                setLinkDialog(null);
                setTimeout(() => {
                  const sel = window.getSelection();
                  const node = sel && sel.focusNode;
                  if (node) {
                    const a =
                      node.parentElement && node.parentElement.closest("a");
                    if (a && linkDialog.newTab) {
                      a.setAttribute("target", "_blank");
                      a.setAttribute("rel", "noopener");
                    }
                    if (a && linkDialog.text) a.textContent = linkDialog.text;
                  }
                  onEdit();
                }, 30);
              }}
            >
              Insert link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image dialog (content insert / edit) */}
      <ImageDialog
        state={imgDialog}
        onClose={() => setImgDialog(null)}
        onUpload={async (files) => (await uploadFiles(files, "content"))[0]}
        onInsert={(opts) => {
          insertHTML(
            renderFigure(
              opts.url,
              opts.alt,
              opts.caption,
              opts.width,
              opts.align,
            ),
          );
          setImgDialog(null);
        }}
        onApply={(opts) => {
          if (imgBar?.img) {
            updateSelectedImg((b) => {
              b.img.setAttribute("alt", opts.alt);
              if (b.fig) {
                let fc = b.fig.querySelector("figcaption");
                if (!fc && opts.caption) {
                  fc = document.createElement("figcaption");
                  b.fig.appendChild(fc);
                }
                if (fc) fc.textContent = opts.caption;
              }
            });
          }
          setImgDialog(null);
        }}
      />

      {/* Media picker for OG/Twitter/featured */}
      <MediaPicker
        open={!!picker}
        target={picker}
        onClose={() => setPicker(null)}
        onPick={(m) => {
          if (picker === "og") upSeo({ ogImage: m.url });
          else if (picker === "twitter") upSeo({ twitterImage: m.url });
          else if (picker === "pick-featured")
            up({
              featuredImage: {
                ...form.featuredImage,
                url: m.url,
                title: form.featuredImage.title || m.name,
                alt: form.featuredImage.alt || m.alt,
              },
            });
          setPicker(null);
        }}
      />

      {/* Schedule dialog */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        form={form}
        onConfirm={async (iso, tz) => {
          await save(true);
          transition("scheduled", iso);
        }}
      />

      {/* Publish checklist */}
      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket
                className="h-4.5 w-4.5 text-violet-500"
                style={{ width: 18, height: 18 }}
              />
              Publish checklist
            </DialogTitle>
            <DialogDescription>
              {checklistOk
                ? "Everything looks great. Ready to go live!"
                : "Fix the highlighted items before publishing — they are critical for search performance."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1 max-h-[320px] overflow-y-auto">
            {checklist.map((c) => (
              <button
                key={c.label}
                onClick={c.fix}
                className={
                  "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors " +
                  (c.ok
                    ? "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20 hover:border-amber-300")
                }
              >
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className="text-[13px] flex-1">{c.label}</span>
                {!c.ok && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Fix →
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="text-xs text-muted-foreground">
              SEO score: <span className="font-bold">{analysis.score}/100</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setChecklistOpen(false)}>
                Keep editing
              </Button>
              <Button
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                disabled={!checklistOk}
                onClick={async () => {
                  setChecklistOpen(false);
                  await save(true);
                  transition("published");
                }}
              >
                Publish now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        form={form}
        analysis={analysis}
      />
    </div>
  );
}

// ---------- Featured image meta ----------
function FeaturedMeta({ form, up, optimizeFeatured, setImgDialog }) {
  const fi = form.featuredImage;
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {fi.title || "image"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3.5 w-3.5" />
          {fi.url.startsWith("/uploads/") ? "Uploaded" : "External"}
        </span>
        {fi.url && (
          <span className="inline-flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            {fi.url.startsWith("/uploads/") ? "Ready" : "External URL"}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {fi.url.includes(".webp") || fi.url.includes("webp")
            ? "WebP · compressed"
            : "Compression available"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Labeled label="Alt text" required>
          <Input
            id="f-featured-alt"
            value={fi.alt}
            onChange={(e) =>
              up({ featuredImage: { ...fi, alt: e.target.value } })
            }
            placeholder="Describe this image…"
          />
        </Labeled>
        <Labeled label="Image title">
          <Input
            value={fi.title}
            onChange={(e) =>
              up({ featuredImage: { ...fi, title: e.target.value } })
            }
            placeholder="Image title"
          />
        </Labeled>
        <Labeled label="Caption">
          <Input
            value={fi.caption}
            onChange={(e) =>
              up({ featuredImage: { ...fi, caption: e.target.value } })
            }
            placeholder="Caption (optional)"
          />
        </Labeled>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => optimizeFeatured("webp")}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Convert to WebP
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => optimizeFeatured("compress")}
        >
          <Gauge className="h-3.5 w-3.5 mr-1" />
          Compress
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setImgDialog({ target: "pick-featured" })}
        >
          <ImageIcon className="h-3.5 w-3.5 mr-1" />
          Pick from library
        </Button>
      </div>
    </div>
  );
}

// ---------- Right rail ----------
function EditorRail({
  tab,
  setTab,
  analysis,
  form,
  up,
  upSeo,
  keywords,
  toc,
  jumpTo,
  suggestions,
  insertSuggestion,
  dismissSuggestion,
  saveSuggestion,
  outline,
  outlineLoading,
  generateOutline,
  applyOutline,
  generatingMeta,
  generateSeoMetaWithAi,
  highlight,
  setImgDialog,
}) {
  const kw = kwMetrics(form.seo.focusKeyword, keywords);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 pt-4 pb-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full h-9 justify-start bg-muted/60 p-1">
            <TabsTrigger value="seo" className="text-xs px-2.5 h-7">
              SEO
            </TabsTrigger>
            <TabsTrigger value="meta" className="text-xs px-2.5 h-7">
              Metadata
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs px-2.5 h-7">
              Links
            </TabsTrigger>
            <TabsTrigger value="brief" className="text-xs px-2.5 h-7">
              Brief
            </TabsTrigger>
            <TabsTrigger value="outline" className="text-xs px-2.5 h-7">
              Outline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* SEO TAB */}
      {tab === "seo" && (
        <CardContent className="p-4 space-y-4">
          <div
            className={
              "rounded-xl border p-4 " +
              (highlight === "featured" ? "ring-2 ring-amber-300" : "")
            }
          >
            <div className="flex items-center gap-4">
              <ScoreRing value={analysis.score} size={76} thickness={8} />
              <div>
                <p className="text-sm font-bold">
                  {analysis.score >= 75
                    ? "Strong SEO"
                    : analysis.score >= 50
                      ? "Needs improvement"
                      : "Poor SEO"}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  {analysis.checks.filter((c) => c.ok).length} of{" "}
                  {analysis.checks.length} checks passing
                </p>
                <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span>{analysis.stats.words} words</span>
                  <span>·</span>
                  <span>{analysis.stats.density}% density</span>
                  <span>·</span>
                  <span>{analysis.stats.internal} int. links</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {analysis.checks.map((c) => (
              <div
                key={c.id}
                className={
                  "rounded-lg px-2.5 py-2 " +
                  (c.ok ? "" : "bg-amber-50/40 dark:bg-amber-950/10")
                }
              >
                <div className="flex items-start gap-2">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : c.warn ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium leading-snug">
                      {c.label}
                      {c.value && c.value !== "—" ? (
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          ({c.value})
                        </span>
                      ) : null}
                    </p>
                    {!c.ok && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {c.fix}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />
          <Labeled label="Focus keyword" required hint="primary target">
            <Input
              id="f-focus-keyword"
              value={form.seo.focusKeyword}
              onChange={(e) => upSeo({ focusKeyword: e.target.value })}
              placeholder="Enter target keyword"
            />
          </Labeled>
          {kw && (
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Volume", fmtNum(kw.volume)],
                ["Difficulty", kw.difficulty + "/100"],
                ["Ranking", "#" + kw.position],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-center"
                >
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {l}
                  </p>
                  <p className="text-sm font-bold mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}
          {kw?.estimated && (
            <p className="text-[10.5px] text-muted-foreground">
              Estimated metrics — add this keyword in the Keyword Manager for
              tracked data.
            </p>
          )}
          <Labeled label="Related keywords" hint="Enter to add">
            <ChipInput
              value={form.seo.secondaryKeywords}
              onChange={(secondaryKeywords) => upSeo({ secondaryKeywords })}
              placeholder="secondary, long-tail, semantic…"
            />
          </Labeled>
        </CardContent>
      )}

      {/* META TAB */}
      {tab === "meta" && (
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">
                Search Engine Meta
              </p>
              <p className="text-[11px] text-muted-foreground">
                High-CTR titles & descriptions
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={generatingMeta}
              onClick={generateSeoMetaWithAi}
              className="h-8 text-xs gap-1.5 border-violet-200 bg-violet-50/60 hover:bg-violet-100 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${generatingMeta ? "animate-spin" : ""}`}
              />
              {generatingMeta ? "Generating…" : "Generate with AI"}
            </Button>
          </div>

          <Labeled
            label="SEO title"
            hint={
              <CharCount
                value={form.seo.metaTitle || form.title}
                max={60}
                min={30}
              />
            }
          >
            <Input
              id="f-seo-title"
              value={form.seo.metaTitle}
              onChange={(e) => upSeo({ metaTitle: e.target.value })}
              placeholder={
                (form.title || "Blog title") + " — add your angle here"
              }
              maxLength={80}
            />
          </Labeled>
          <Labeled
            label="Meta description"
            hint={
              <CharCount value={form.seo.metaDescription} max={160} min={120} />
            }
          >
            <Textarea
              id="f-meta-description"
              value={form.seo.metaDescription}
              onChange={(e) => upSeo({ metaDescription: e.target.value })}
              placeholder="Your meta description appears here in Google results…"
              rows={3}
              maxLength={200}
            />
          </Labeled>
          <Labeled label="Canonical URL">
            <Input
              value={form.seo.canonical}
              onChange={(e) => upSeo({ canonical: e.target.value })}
              placeholder="https://example.com/blog/…"
            />
          </Labeled>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium">Index</p>
              <p className="text-[11px] text-muted-foreground">
                Allow search engines to index this page
              </p>
            </div>
            <Switch
              checked={form.seo.robots.index}
              onCheckedChange={(v) =>
                upSeo({ robots: { ...form.seo.robots, index: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium">Follow links</p>
              <p className="text-[11px] text-muted-foreground">
                Crawlers follow links from this page
              </p>
            </div>
            <Switch
              checked={form.seo.robots.follow}
              onCheckedChange={(v) =>
                upSeo({ robots: { ...form.seo.robots, follow: v } })
              }
            />
          </div>

          <Separator />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Open Graph (Facebook / LinkedIn)
          </p>
          <Labeled label="OG Title">
            <Input
              value={form.seo.ogTitle}
              onChange={(e) => upSeo({ ogTitle: e.target.value })}
              placeholder={form.title}
            />
          </Labeled>
          <Labeled label="OG Description">
            <Textarea
              value={form.seo.ogDescription}
              onChange={(e) => upSeo({ ogDescription: e.target.value })}
              rows={2}
              placeholder={form.seo.metaDescription || form.title}
            />
          </Labeled>
          <Labeled label="OG Image">
            <div className="flex gap-2">
              <Input
                value={form.seo.ogImage}
                onChange={(e) => upSeo({ ogImage: e.target.value })}
                placeholder="Image URL"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 shrink-0"
                onClick={() => setImgDialog({ target: "og" })}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </Labeled>

          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Twitter / X card
          </p>
          <Labeled label="Twitter title">
            <Input
              value={form.seo.twitterTitle}
              onChange={(e) => upSeo({ twitterTitle: e.target.value })}
              placeholder={form.title}
            />
          </Labeled>
          <Labeled label="Twitter description">
            <Textarea
              value={form.seo.twitterDescription}
              onChange={(e) => upSeo({ twitterDescription: e.target.value })}
              rows={2}
              placeholder={form.seo.metaDescription || form.title}
            />
          </Labeled>
          <Labeled label="Twitter image">
            <div className="flex gap-2">
              <Input
                value={form.seo.twitterImage}
                onChange={(e) => upSeo({ twitterImage: e.target.value })}
                placeholder="Image URL"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 shrink-0"
                onClick={() => setImgDialog({ target: "twitter" })}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </Labeled>

          <Separator />
          {/* Google preview */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Google search preview
          </p>
          <div className="rounded-xl border border-border p-4 bg-white dark:bg-card">
            <p className="gpreview-url">
              https://example.com
              <span className="text-muted-foreground">
                {" "}
                › blog › {form.slug || "your-blog-slug"}
              </span>
            </p>
            <p className="gpreview-title mt-1 line-clamp-1">
              {form.seo.metaTitle ||
                form.title ||
                "Your SEO optimized blog title"}
            </p>
            <p className="gpreview-desc mt-1 line-clamp-2">
              {form.seo.metaDescription ||
                "Your meta description appears here in Google search results. Write 120–160 characters for the best snippet."}
            </p>
          </div>

          {/* Social previews */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Social previews
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              Facebook / LinkedIn
            </div>
            {(form.seo.ogImage || form.featuredImage.url) && (
              <img
                src={form.seo.ogImage || form.featuredImage.url}
                alt=""
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-3 bg-muted/30">
              <p className="text-[10px] uppercase text-muted-foreground">
                example.com
              </p>
              <p className="text-[13px] font-semibold leading-snug line-clamp-1">
                {form.seo.ogTitle || form.title || "OG Title"}
              </p>
              <p className="text-[11.5px] text-muted-foreground line-clamp-2">
                {form.seo.ogDescription ||
                  form.seo.metaDescription ||
                  "Social share description"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              Twitter / X
            </div>
            {(form.seo.twitterImage || form.featuredImage.url) && (
              <img
                src={form.seo.twitterImage || form.featuredImage.url}
                alt=""
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-3 bg-muted/30">
              <p className="text-[13px] font-semibold leading-snug line-clamp-1">
                {form.seo.twitterTitle || form.title || "Twitter title"}
              </p>
              <p className="text-[11.5px] text-muted-foreground line-clamp-2">
                {form.seo.twitterDescription ||
                  form.seo.metaDescription ||
                  "Twitter share description"}
              </p>
            </div>
          </div>
        </CardContent>
      )}

      {/* LINKS TAB */}
      {tab === "links" && (
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-[13px] font-semibold">Internal links</p>
            <p className="text-[11.5px] text-muted-foreground">
              Suggested articles based on this blog&apos;s topic. Insert,
              ignore, or save for later.
            </p>
          </div>
          {suggestions.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
              No more suggestions. Add a focus keyword to improve matching.
            </p>
          )}
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border p-3 space-y-2 hover:border-violet-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium leading-snug">
                  {s.title}
                </p>
                <Badge
                  variant="outline"
                  className={
                    "shrink-0 text-[10.5px] " +
                    (s.relevance >= 80
                      ? "border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-300"
                      : "border-violet-200 text-violet-600 dark:border-violet-900 dark:text-violet-300")
                  }
                >
                  {s.relevance}% match
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Anchor: “{s.title}” → {s.url}
              </p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11.5px]"
                  onClick={() => insertSuggestion(s)}
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Insert link
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11.5px] text-muted-foreground"
                  onClick={() => dismissSuggestion(s)}
                >
                  Ignore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11.5px] text-muted-foreground"
                  onClick={() => saveSuggestion(s)}
                >
                  <BookmarkPlus className="h-3 w-3 mr-1" />
                  Save for later
                </Button>
              </div>
            </div>
          ))}
          {form.savedSuggestions.length > 0 && (
            <>
              <Separator />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Saved for later
              </p>
              {form.savedSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-[12.5px] truncate">{s.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11.5px]"
                    onClick={() => insertSuggestion(s)}
                  >
                    Insert
                  </Button>
                </div>
              ))}
            </>
          )}
        </CardContent>
      )}

      {/* BRIEF TAB */}
      {tab === "brief" && (
        <CardContent className="p-4 space-y-3.5">
          <div>
            <p className="text-[13px] font-semibold">Content brief</p>
            <p className="text-[11.5px] text-muted-foreground">
              Define the strategy before writing, then generate a structure.
            </p>
          </div>
          <Labeled label="Target keyword">
            <Input
              value={form.brief.targetKeyword}
              onChange={(e) =>
                up({ brief: { ...form.brief, targetKeyword: e.target.value } })
              }
              placeholder="e.g. technical SEO"
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Search intent">
              <Select
                value={form.brief?.intent || "Informational"}
                onValueChange={(v) =>
                  up({ brief: { ...form.brief, intent: v } })
                }
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Informational",
                    "Commercial",
                    "Transactional",
                    "Navigational",
                  ].map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Labeled>
            <Labeled label="Content type">
              <Select
                value={form.brief?.contentType || "Guide"}
                onValueChange={(v) =>
                  up({ brief: { ...form.brief, contentType: v } })
                }
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Guide",
                    "Listicle",
                    "Tutorial",
                    "Case Study",
                    "Comparison",
                  ].map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Labeled>
          </div>
          <Labeled label="Target audience">
            <Input
              value={form.brief.audience}
              onChange={(e) =>
                up({ brief: { ...form.brief, audience: e.target.value } })
              }
              placeholder="e.g. Marketing teams, SEO specialists"
            />
          </Labeled>
          <Labeled label="Suggested word count">
            <Input
              type="number"
              value={form.brief.wordCount}
              onChange={(e) =>
                up({ brief: { ...form.brief, wordCount: +e.target.value } })
              }
            />
          </Labeled>
          <Labeled label="Questions to answer" hint="one per line">
            <Textarea
              rows={3}
              value={form.brief.questions}
              onChange={(e) =>
                up({ brief: { ...form.brief, questions: e.target.value } })
              }
              placeholder="What is X?\nHow much does X cost?"
            />
          </Labeled>
          <Labeled label="Required headings" hint="one per line">
            <Textarea
              rows={3}
              value={form.brief.requiredHeadings}
              onChange={(e) =>
                up({
                  brief: { ...form.brief, requiredHeadings: e.target.value },
                })
              }
              placeholder={"What is technical SEO\nCommon mistakes"}
            />
          </Labeled>
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            onClick={generateOutline}
            disabled={outlineLoading}
          >
            {outlineLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Generate Content Structure
          </Button>
          {outline && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-3.5 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                Recommended structure
              </p>
              <p className="text-[13px] font-semibold leading-snug">
                H1 · {outline.h1}
              </p>
              {outline.h2s.map((h, i) => (
                <div key={i} className="pl-2">
                  <p className="text-[12.5px] font-medium">H2 · {h.h2}</p>
                  {h.h3s.map((h3, j) => (
                    <p
                      key={j}
                      className="text-[12px] text-muted-foreground pl-3"
                    >
                      H3 · {h3}
                    </p>
                  ))}
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {outline.relatedKeywords.map((k) => (
                  <Badge
                    key={k}
                    variant="outline"
                    className="text-[10.5px] font-normal"
                  >
                    {k}
                  </Badge>
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={applyOutline}>
                Apply structure to editor
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* OUTLINE TAB */}
      {tab === "outline" && (
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-violet-500" />
            <p className="text-[13px] font-semibold">Table of contents</p>
          </div>
          {toc.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
              Add H2 / H3 headings in your content to build the outline.
            </p>
          )}
          {toc.map((t, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={
                "w-full text-left rounded-lg px-3 py-2 text-[12.5px] hover:bg-accent transition-colors flex items-center gap-2 " +
                (t.level === 2 ? "" : "ml-4")
              }
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{t.text}</span>
            </button>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ---------- Image dialog ----------
function ImageDialog({ state, onClose, onUpload, onInsert, onApply }) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [width, setWidth] = useState("100");
  const [align, setAlign] = useState("center");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state) {
      setMode("url");
      setUrl(state.img?.src || "");
      setAlt(state.img?.alt || "");
      setCaption(state.img?.caption || "");
      setWidth("100");
      setAlign("center");
    }
  }, [state]);

  if (!state) return null;
  const isEdit = state.mode === "edit-image";

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Image settings" : "Insert image"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update alt text and caption for accessibility and SEO."
              : "Upload a file or paste an image URL."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          {!isEdit && (
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="w-full">
                <TabsTrigger value="url" className="w-full">
                  Paste URL
                </TabsTrigger>
                <TabsTrigger value="upload" className="w-full">
                  Upload
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {!isEdit && mode === "url" && (
            <Labeled label="Image URL">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </Labeled>
          )}
          {!isEdit && mode === "upload" && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/20 py-8 cursor-pointer hover:border-violet-400 transition-colors">
              <Upload className="h-6 w-6 text-violet-400" />
              <span className="text-sm font-medium">Click to upload</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  const c = await onUpload([f]);
                  setBusy(false);
                  if (c) {
                    setUrl(c.url);
                    setMode("url");
                    toast.success("Image uploaded");
                  }
                }}
              />
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </label>
          )}
          <Labeled label="Alt text" required>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for SEO & accessibility"
            />
          </Labeled>
          <Labeled label="Caption">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional caption"
            />
          </Labeled>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Width">
                <Select value={width} onValueChange={setWidth}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["33", "50", "75", "100"].map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
              <Labeled label="Alignment">
                <Select value={align} onValueChange={setAlign}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["left", "center", "right"].map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              isEdit
                ? onApply({ alt, caption })
                : onInsert({ url, alt, caption, width: width + "%", align })
            }
            disabled={(!isEdit && !url) || (isEdit === false && !url)}
          >
            {isEdit ? "Save changes" : "Insert image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Media picker ----------
function MediaPicker({ open, target, onClose, onPick }) {
  const { data: media } = useSWR(open ? "/api/media" : null, fetcher);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from Media Library</DialogTitle>
          <DialogDescription>
            Pick an existing asset instead of uploading a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pt-1">
          {(media || []).map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m)}
              className="group rounded-xl overflow-hidden border border-border hover:border-violet-400 transition-colors text-left"
            >
              <img
                src={m.url}
                alt={m.alt || m.name}
                className="h-24 w-full object-cover group-hover:scale-[1.03] transition-transform"
              />
              <p className="text-[10px] truncate px-1.5 py-1 text-muted-foreground">
                {m.name}
              </p>
            </button>
          ))}
          {(!media || media.length === 0) && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">
              No media yet — upload images first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Schedule dialog ----------
function ScheduleDialog({ open, onOpenChange, form, onConfirm }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [tz, setTz] = useState("Asia/Kolkata");

  useEffect(() => {
    if (open) {
      const existing = form.scheduledAt
        ? new Date(form.scheduledAt)
        : new Date(Date.now() + 86400000);
      setDate(existing.toISOString().slice(0, 10));
      setTime(existing.toISOString().slice(11, 16));
    }
  }, [open, form.scheduledAt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock
              className="h-4.5 w-4.5 text-violet-500"
              style={{ width: 18, height: 18 }}
            />
            Schedule publish
          </DialogTitle>
          <DialogDescription>
            The blog will go live automatically at the chosen time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <Labeled label="Publish date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Labeled>
          <Labeled label="Publish time" required>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Labeled>
        </div>
        <Labeled label="Timezone">
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Labeled>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            disabled={!date || !time}
            onClick={() => {
              onConfirm(new Date(date + "T" + time + ":00").toISOString(), tz);
              onOpenChange(false);
            }}
          >
            {form.status === "scheduled" ? "Update schedule" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Preview modal ----------
function PreviewModal({ open, onOpenChange, form, analysis }) {
  const [device, setDevice] = useState("desktop");
  const [dark, setDark] = useState(false);
  const [ptab, setPtab] = useState("article");
  const widths = { desktop: "100%", tablet: "768px", mobile: "390px" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] h-[86vh] p-0 flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-violet-500" />
              Preview — {form.title || "Untitled"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the blog article
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={ptab} onValueChange={setPtab}>
              <TabsList className="h-8">
                <TabsTrigger value="article" className="text-xs h-6 px-2.5">
                  Article
                </TabsTrigger>
                <TabsTrigger value="google" className="text-xs h-6 px-2.5">
                  Google
                </TabsTrigger>
                <TabsTrigger value="social" className="text-xs h-6 px-2.5">
                  Social
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center rounded-lg border border-border p-0.5">
              {[
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ].map(([d, Icon]) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={
                    "h-6 w-7 rounded flex items-center justify-center " +
                    (device === d
                      ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
                      : "text-muted-foreground")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDark(!dark)}
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogHeader>
        <div className={"flex-1 overflow-y-auto " + (dark ? "dark" : "")}>
          <div
            className={
              dark
                ? "bg-[hsl(240_8%_6%)] min-h-full"
                : "bg-background min-h-full"
            }
          >
            <div
              className="mx-auto transition-all"
              style={{ width: widths[device], maxWidth: "100%" }}
            >
              {ptab === "article" && (
                <div className="p-6 lg:p-10">
                  {form.featuredImage.url && (
                    <img
                      src={form.featuredImage.url}
                      alt={form.featuredImage.alt}
                      className="w-full h-64 object-cover rounded-2xl mb-6"
                    />
                  )}
                  <Badge variant="outline" className="text-[11px] mb-3">
                    {form.category || "Uncategorized"}
                  </Badge>
                  <h1 className="text-3xl font-bold tracking-tight leading-tight">
                    {form.title || "Your blog title"}
                  </h1>
                  <p className="text-[13px] text-muted-foreground mt-3 flex items-center gap-2">
                    By {form.author || "Author"} ·{" "}
                    {new Date().toLocaleDateString("en", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {analysis.stats.words} words
                  </p>
                  <div
                    className="prose-studio mt-6"
                    dangerouslySetInnerHTML={{
                      __html:
                        form.contentHtml ||
                        "<p>Start writing in the editor to see the preview…</p>",
                    }}
                  />
                </div>
              )}
              {ptab === "google" && (
                <div className="p-8">
                  <div className="max-w-xl mx-auto rounded-2xl border border-border p-6 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-4">
                      Google Search preview
                    </p>
                    <p className="gpreview-url">
                      https://example.com › blog ›{" "}
                      {form.slug || "your-blog-slug"}
                    </p>
                    <p className="gpreview-title mt-1.5">
                      {form.seo.metaTitle ||
                        form.title ||
                        "Your SEO optimized blog title"}
                    </p>
                    <p className="gpreview-desc mt-1.5">
                      {form.seo.metaDescription ||
                        "Your meta description appears here…"}
                    </p>
                  </div>
                </div>
              )}
              {ptab === "social" && (
                <div className="p-8 space-y-6">
                  <div className="max-w-lg mx-auto rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="bg-muted/60 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
                      Facebook / LinkedIn
                    </div>
                    {(form.seo.ogImage || form.featuredImage.url) && (
                      <img
                        src={form.seo.ogImage || form.featuredImage.url}
                        alt=""
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-4 bg-muted/30">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        example.com
                      </p>
                      <p className="text-[14px] font-semibold">
                        {form.seo.ogTitle || form.title || "OG Title"}
                      </p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {form.seo.ogDescription ||
                          form.seo.metaDescription ||
                          "Social share description"}
                      </p>
                    </div>
                  </div>
                  <div className="max-w-lg mx-auto rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="bg-muted/60 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
                      Twitter / X
                    </div>
                    {(form.seo.twitterImage || form.featuredImage.url) && (
                      <img
                        src={form.seo.twitterImage || form.featuredImage.url}
                        alt=""
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-4 bg-muted/30">
                      <p className="text-[14px] font-semibold">
                        {form.seo.twitterTitle || form.title || "Twitter title"}
                      </p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {form.seo.twitterDescription ||
                          form.seo.metaDescription ||
                          "Twitter share description"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
