"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
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
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Save,
  Eye,
  Rocket,
  Eraser,
  Table,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Check,
  X,
  Plus,
  Search,
  Video,
  HelpCircle,
  FileText,
  User,
  Sparkles,
  BookOpen,
  FolderOpen,
  Calendar,
  Clock,
  Tag,
  Edit3,
  Copy,
  MoreHorizontal,
  CalendarClock,
} from "lucide-react";
import { ScheduleDialog, StatusBadge, Labeled } from "../bits";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  api,
  fetcher,
  getImageThumbnailUrl,
  TIME_AGO_SHORT,
} from "@/lib/client";
import { slugify } from "@/lib/seo";

// ==========================================
// HELPERS
// ==========================================

function renderFigure(url, alt, caption, width, align) {
  let style = "";
  if (width) style += "width:" + width + "%;";
  if (align === "center") style += "margin-left:auto;margin-right:auto;display:block;";
  if (align === "left") style += "float:left;margin:0 18px 12px 0;";
  if (align === "right") style += "float:right;margin:0 0 12px 18px;";
  return (
    '<figure style="margin:16px 0;' + (align === 'center' ? 'text-align:center;' : '') + '">' +
    '<img src="' + url + '" alt="' + (alt || '') + '" style="border-radius:12px;max-width:100%;' + style + '" />' +
    (caption ? '<figcaption style="font-size:12px;color:#6b7280;margin-top:6px;text-align:center;">' + caption + '</figcaption>' : '') +
    '</figure><p><br/></p>'
  );
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function stripToText(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi)];
  return matches.map((m, idx) => ({
    id: `heading-${idx}`,
    level: m[1].toLowerCase(),
    text: m[2].replace(/<[^>]*>/g, "").trim(),
  }));
}

// Convert legacy structured steps into modern rich content HTML
function convertStepsToHtml(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return "";
  return `<ol>${steps
    .map(
      (s, idx) =>
        `<li><p><strong>${s.title ? s.title + ": " : ""}</strong>${s.instruction || ""}</p>${
          s.callout?.text
            ? `<div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 12px 16px; margin: 12px 0; color: #5b21b6;"><strong>💡 Tip: </strong>${s.callout.text}</div>`
            : ""
        }${
          s.imageUrl
            ? `<p><img src="${s.imageUrl}" alt="${s.title || `Step ${idx + 1}`}" style="max-width: 100%; border-radius: 12px; margin: 12px 0;" /></p>`
            : ""
        }</li>`
    )
    .join("")}</ol>`;
}

// Ensure any embedded video in editor has visible Edit URL & Delete controls
function ensureVideoControls(html) {
  if (!html) return "";
  if (!html.includes("kb-video-wrapper") && !html.includes("<iframe")) return html;
  return html.replace(
    /(<div[^>]*class=["'][^"']*kb-video-wrapper[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/gi,
    (match, openTag, content) => {
      if (content.includes("kb-edit-video-btn")) return match;
      const iframeMatch = content.match(/<iframe[^>]*src=["']([^"']*)["'][^>]*>[\s\S]*?<\/iframe>/i);
      const embedUrl = iframeMatch ? iframeMatch[1] : "";
      return `<div class="kb-video-wrapper" style="margin:20px 0;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);background:#000;"><div contenteditable="false" style="display:flex;align-items:center;justify-content:space-between;background:#18181b;padding:8px 14px;border-top-left-radius:14px;border-top-right-radius:14px;color:#fff;font-size:12px;user-select:none;"><span style="display:flex;align-items:center;gap:6px;font-weight:600;">🎥 YouTube Video</span><div style="display:flex;gap:8px;"><button type="button" class="kb-edit-video-btn" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Edit URL</button><button type="button" class="kb-delete-video-btn" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Delete</button></div></div><div style="position:relative;aspect-ratio:16/9;width:100%;"><iframe src="${embedUrl}" style="width:100%;height:100%;border:0;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div>`;
    }
  );
}

// Convert legacy structured article fields into modern unified rich HTML document
function convertArticleToUnifiedHtml(art) {
  if (!art) return "";
  let html = art.contentHtml || "";
  if (html && html.trim().length > 30) {
    return ensureVideoControls(html);
  }

  const parts = [];
  if (art.overview) {
    parts.push(`<h2>Overview</h2><p>${art.overview}</p>`);
  }
  if (Array.isArray(art.prerequisites) && art.prerequisites.length > 0) {
    parts.push(
      `<h2>Prerequisites</h2><ul>${art.prerequisites
        .map((p) => `<li>${p}</li>`)
        .join("")}</ul>`
    );
  }
  if (art.videoUrl) {
    const embed = getYouTubeEmbedUrl(art.videoUrl);
    if (embed) {
      parts.push(
        `<h2>Video Guide</h2><div class="kb-video-wrapper" style="margin:20px 0;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);background:#000;"><div contenteditable="false" style="display:flex;align-items:center;justify-content:space-between;background:#18181b;padding:8px 14px;border-top-left-radius:14px;border-top-right-radius:14px;color:#fff;font-size:12px;user-select:none;"><span style="display:flex;align-items:center;gap:6px;font-weight:600;">🎥 YouTube Video</span><div style="display:flex;gap:8px;"><button type="button" class="kb-edit-video-btn" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Edit URL</button><button type="button" class="kb-delete-video-btn" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Delete</button></div></div><div style="position:relative;aspect-ratio:16/9;width:100%;"><iframe src="${embed}" style="width:100%;height:100%;border:0;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div><p><br/></p>`
      );
    }
  }
  if (Array.isArray(art.steps) && art.steps.length > 0) {
    parts.push(`<h2>Step-by-Step Instructions</h2>${convertStepsToHtml(art.steps)}`);
  }

  return parts.join("<p><br/></p>");
}

// ==========================================
// IMAGE DIALOG (Insert or Edit Image)
// ==========================================
function ImageDialog({ state, onClose, onUpload, onInsert, onApply }) {
  const isEdit = state?.mode === "edit-image";
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [width, setWidth] = useState("100");
  const [align, setAlign] = useState("center");
  const [busy, setBusy] = useState(false);
  const [libSearch, setLibSearch] = useState("");

  const { data: media, isLoading: libLoading } = useSWR(
    state && mode === "library" ? "/api/media" : null,
    fetcher
  );

  useEffect(() => {
    if (state) {
      if (state.mode === "edit-image" && state.img) {
        setUrl(state.img.src || "");
        setAlt(state.img.alt || "");
        setCaption(state.img.caption || "");
        setWidth(state.img.width || "100");
        setAlign(state.img.align || "center");
        setMode("url");
      } else {
        setMode("url");
        setUrl("");
        setAlt("");
        setCaption("");
        setWidth("100");
        setAlign("center");
      }
      setLibSearch("");
    }
  }, [state]);

  if (!state) return null;

  const libImages = (Array.isArray(media) ? media : media?.items || [])
    .filter((m) => !m.type || m.type === "image")
    .filter((m) => {
      if (!libSearch.trim()) return true;
      const q = libSearch.toLowerCase();
      return (
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.alt && m.alt.toLowerCase().includes(q)) ||
        (m.title && m.title.toLowerCase().includes(q))
      );
    });

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Image Settings & Replace" : "Insert Image"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update alt text, caption, dimensions, or replace this image."
              : "Upload a file, choose from library, or paste an image URL."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="url">Paste URL</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "url" && (
            <Labeled label="Image URL">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </Labeled>
          )}

          {mode === "upload" && (
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
                    setAlt(c.name?.replace(/\.[^.]+$/, "") || "");
                    setMode("url");
                    toast.success("Image uploaded & auto-optimized to WebP");
                  }
                }}
              />
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </label>
          )}

          {mode === "library" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  placeholder="Search library images..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[170px] overflow-y-auto p-1 border border-border rounded-lg bg-muted/20">
                {libLoading ? (
                  <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-violet-500" />
                    Loading library...
                  </div>
                ) : libImages.length > 0 ? (
                  libImages.map((m) => (
                    <button
                      key={m.id || m.url}
                      type="button"
                      onClick={() => {
                        setUrl(m.url);
                        setAlt(m.alt || m.name?.replace(/\.[^.]+$/, "") || "");
                        setCaption(m.caption || "");
                        toast.success("Selected from library");
                      }}
                      className={`group relative rounded-md overflow-hidden border text-left transition-all cursor-pointer ${
                        url === m.url
                          ? "ring-2 ring-violet-500 border-violet-500"
                          : "border-border hover:border-violet-400"
                      }`}
                    >
                      <img
                        src={getImageThumbnailUrl ? getImageThumbnailUrl(m.url, 400, 240) : m.url}
                        alt={m.alt || m.name}
                        className="h-16 w-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                      <p className="text-[10px] truncate px-1 py-0.5 text-muted-foreground bg-background/90">
                        {m.name || m.title || "image"}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                    No images found in library
                  </div>
                )}
              </div>
              {url && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 inline shrink-0" />
                  Selected image ready
                </p>
              )}
            </div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (isEdit && onApply) {
                onApply({ url, alt, caption, width, align });
              } else {
                onInsert({ url, alt, caption, width, align });
              }
            }}
            disabled={!url}
          >
            {isEdit ? "Update Image" : "Insert Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// VISUAL TEMPLATE CONTENT EDITOR (NO RAW HTML)
// ==========================================
function TemplateVisualEditor({ initialValue = "", onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && initialValue !== undefined) {
      if (ref.current.innerHTML !== initialValue) {
        ref.current.innerHTML = initialValue;
      }
    }
  }, [initialValue]);

  const exec = (cmd, arg = null) => {
    if (typeof document !== "undefined") {
      document.execCommand(cmd, false, arg);
      if (ref.current) {
        onChange(ref.current.innerHTML);
      }
    }
  };

  const insertTip = () => {
    const tip = `<div style="background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 14px;margin:10px 0;color:#5b21b6;"><strong>💡 Pro Tip: </strong>Add helpful advice or shortcut...</div><p><br/></p>`;
    exec("insertHTML", tip);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all">
      {/* Visual Toolbar (Normal human formatting buttons, NO HTML tags) */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-border bg-muted/40 flex-wrap text-xs">
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h2>")}
          className="px-2 py-1 font-bold rounded hover:bg-muted text-foreground transition-colors"
          title="Section Heading (H2)"
        >
          H2 Heading
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h3>")}
          className="px-2 py-1 font-semibold rounded hover:bg-muted text-foreground transition-colors"
          title="Sub Heading (H3)"
        >
          H3 Subheading
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<p>")}
          className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Normal Text"
        >
          Paragraph
        </button>
        <span className="text-border mx-0.5">|</span>
        <button
          type="button"
          onClick={() => exec("bold")}
          className="h-6 w-6 rounded flex items-center justify-center font-bold hover:bg-muted text-foreground transition-colors"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="h-6 w-6 rounded flex items-center justify-center italic hover:bg-muted text-foreground transition-colors"
          title="Italic"
        >
          I
        </button>
        <span className="text-border mx-0.5">|</span>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="px-2 py-1 rounded hover:bg-muted text-foreground font-medium flex items-center gap-1 transition-colors"
          title="Numbered Steps (1, 2, 3)"
        >
          <ListOrdered className="w-3.5 h-3.5" /> Steps
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="px-2 py-1 rounded hover:bg-muted text-foreground font-medium flex items-center gap-1 transition-colors"
          title="Bullet Points"
        >
          <List className="w-3.5 h-3.5" /> Bullets
        </button>
        <span className="text-border mx-0.5">|</span>
        <button
          type="button"
          onClick={insertTip}
          className="px-2 py-1 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 font-medium flex items-center gap-1 transition-colors"
          title="Insert Pro Tip Box"
        >
          💡 Tip Box
        </button>
      </div>

      {/* Visual Content Editable Area */}
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        className="p-3.5 min-h-[170px] max-h-[260px] overflow-y-auto text-sm leading-relaxed focus:outline-hidden prose prose-sm dark:prose-invert max-w-none"
      />
    </div>
  );
}

// ==========================================
// TEMPLATE SELECTION & CUSTOM CREATION DIALOG
// ==========================================
function TemplateModal({
  open,
  onClose,
  onApplyTemplate,
  currentContent,
  currentFaqs,
}) {
  const { data, mutate, isLoading } = useSWR(open ? "/api/kb/templates" : null, fetcher);
  const templates = data?.templates || [];

  const DEFAULT_STARTER = `<h2>Overview</h2><p>Briefly describe what this guide covers and who it is for.</p><h2>Step-by-Step Instructions</h2><ol><li><p><strong>Step 1: </strong>Describe the first action...</p></li><li><p><strong>Step 2: </strong>Describe the second action...</p></li></ol><div style="background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:12px 16px;margin:12px 0;color:#5b21b6;"><strong>💡 Pro Tip: </strong>Add helpful shortcuts or advice here...</div>`;

  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "create"
  const [editingTemplate, setEditingTemplate] = useState(null); // template currently being edited
  const [confirmReplace, setConfirmReplace] = useState(null);
  const [savingCustom, setSavingCustom] = useState(false);
  const [updatingCustom, setUpdatingCustom] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // New Template Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📄");
  const [contentHtml, setContentHtml] = useState("");

  // Edit Template Form
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("📄");
  const [editContentHtml, setEditContentHtml] = useState("");

  const EMOJI_OPTIONS = ["🎯", "⚙️", "🔧", "⚡", "📄", "📦", "💡", "🏷️", "🚀", "💳", "🛠️", "📚"];

  // When modal opens or tab changes, initialize contentHtml with canvas or starter
  useEffect(() => {
    if (open) {
      const textOnly = (currentContent || "").replace(/<[^>]*>/g, "").trim();
      setContentHtml(textOnly.length > 10 ? currentContent : DEFAULT_STARTER);
    }
  }, [open, currentContent]);

  const handleApply = (tmpl) => {
    const textOnly = (currentContent || "").replace(/<[^>]*>/g, "").trim();
    if (textOnly.length > 25) {
      setConfirmReplace(tmpl);
    } else {
      onApplyTemplate(tmpl, "replace");
      onClose();
    }
  };

  const handleConfirmApply = (mode) => {
    if (confirmReplace) {
      onApplyTemplate(confirmReplace, mode);
      setConfirmReplace(null);
      onClose();
    }
  };

  // Save new custom template
  const handleSaveCustom = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a template description");
      return;
    }
    if (!icon) {
      toast.error("Please select an icon / emoji");
      return;
    }

    const textOnly = (contentHtml || "").replace(/<[^>]*>/g, "").trim();
    if (!textOnly) {
      toast.error("Please write some headings or content in Template Content & Layout");
      return;
    }

    setSavingCustom(true);
    try {
      await api.post("/kb/templates", {
        name: name.trim(),
        description: description.trim(),
        icon: icon || "📄",
        contentHtml: contentHtml || DEFAULT_STARTER,
        faqs: currentFaqs || [],
      });
      toast.success(`Template "${name}" saved!`);
      mutate();
      setName("");
      setDescription("");
      setIcon("📄");
      setActiveTab("browse");
    } catch (err) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingCustom(false);
    }
  };

  // Start editing a custom template
  const handleStartEdit = (tmpl) => {
    setEditingTemplate(tmpl);
    setEditName(tmpl.name || "");
    setEditDescription(tmpl.description || "");
    setEditIcon(tmpl.icon || "📄");
    setEditContentHtml(tmpl.contentHtml || "");
  };

  // Save changes to edited template
  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!editDescription.trim()) {
      toast.error("Please enter a template description");
      return;
    }
    if (!editIcon) {
      toast.error("Please select an icon / emoji");
      return;
    }
    const textOnly = (editContentHtml || "").replace(/<[^>]*>/g, "").trim();
    if (!textOnly) {
      toast.error("Please write some headings or content in Template Content & Layout");
      return;
    }
    if (!editingTemplate?.id) return;

    setUpdatingCustom(true);
    try {
      await api.put(`/kb/templates/${editingTemplate.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        icon: editIcon || "📄",
        contentHtml: editContentHtml,
      });
      toast.success("Template updated successfully!");
      mutate();
      setEditingTemplate(null);
    } catch (err) {
      toast.error(err.message || "Failed to update template");
    } finally {
      setUpdatingCustom(false);
    }
  };

  // Sync canvas to edit form
  const handleSyncFromCanvas = () => {
    const textOnly = (currentContent || "").replace(/<[^>]*>/g, "").trim();
    if (!textOnly) {
      toast.error("Your editor canvas is empty.");
      return;
    }
    setEditContentHtml(currentContent);
    toast.success("Copied current editor canvas into template content!");
  };

  // Delete custom template
  const handleDeleteCustom = async (tmpl) => {
    if (!window.confirm(`Delete template "${tmpl.name}"?`)) return;
    setDeletingId(tmpl.id);
    try {
      await api.delete(`/kb/templates/${tmpl.id}`);
      toast.success(`Template "${tmpl.name}" deleted.`);
      mutate();
      if (editingTemplate?.id === tmpl.id) setEditingTemplate(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Knowledge Base Templates</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose a ready-made template or create your own custom layout.
              </DialogDescription>
            </div>
          </div>

          {!editingTemplate && (
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => { setActiveTab("browse"); setConfirmReplace(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "browse"
                    ? "bg-violet-600 text-white"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Browse Templates ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("create"); setConfirmReplace(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "create"
                    ? "bg-violet-600 text-white"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Template
              </button>
            </div>
          )}
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {confirmReplace && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-500/10 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Editor already has content
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Applying <strong>"{confirmReplace.name}"</strong>: Replace your current editor content, or append to the bottom?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7"
                  onClick={() => handleConfirmApply("replace")}
                >
                  Replace Content
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => handleConfirmApply("append")}
                >
                  Append to Bottom
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-muted-foreground"
                  onClick={() => setConfirmReplace(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* VIEW: EDITING EXISTING TEMPLATE */}
          {editingTemplate ? (
            <form onSubmit={handleUpdateTemplate} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="text-xs text-violet-600 hover:underline font-semibold flex items-center gap-1"
                >
                  ← Back to Templates
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncFromCanvas}
                    className="text-xs font-semibold gap-1 text-violet-600 border-violet-500/30 hover:bg-violet-500/10 h-7"
                    title="Pull current editor content into this template"
                  >
                    <Sparkles className="w-3 h-3" />
                    Copy from Current Canvas
                  </Button>
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-500/20">
                    Editing Template
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Template Name *
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. GST Tax Invoice Setup Guide"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Description *
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Short summary of what this template is for"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Choose Icon / Emoji *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditIcon(emoji)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                        editIcon === emoji
                          ? "bg-violet-600 text-white scale-110 shadow-xs"
                          : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Content Visual Editor */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Template Content &amp; Layout *
                </label>
                <TemplateVisualEditor
                  initialValue={editContentHtml}
                  onChange={setEditContentHtml}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Edit the headings, numbered steps, and tips above.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingCustom || !editName.trim() || !editDescription.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs"
                >
                  {updatingCustom && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          ) : activeTab === "browse" ? (
            /* TAB 1: BROWSE TEMPLATES */
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No templates found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-4 rounded-xl border border-border bg-card hover:border-violet-500/50 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-2xl p-2 rounded-xl bg-accent/40 shrink-0 w-11 h-11 flex items-center justify-center">
                          {tmpl.icon || "📄"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{tmpl.name}</span>
                            {tmpl.isCustom ? (
                              <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 font-semibold">
                                Custom
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-muted/60 text-muted-foreground font-medium">
                                Built-in
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {tmpl.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          onClick={() => handleApply(tmpl)}
                          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs h-8 shadow-xs"
                        >
                          Use Template
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
                              title="Template options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-38">
                            <DropdownMenuItem
                              onClick={() => handleStartEdit(tmpl)}
                              className="cursor-pointer text-xs font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-2 text-violet-500" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteCustom(tmpl)}
                              disabled={deletingId === tmpl.id}
                              className="cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Template
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: CREATE NEW TEMPLATE (With Visual Editor) */
            <form onSubmit={handleSaveCustom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Template Name *
                </label>
                <Input
                  placeholder="e.g. GST Tax Invoice Setup Guide"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Description *
                </label>
                <Input
                  placeholder="e.g. Standard layout for all tax and invoice configuration guides"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Choose Icon / Emoji *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                        icon === emoji
                          ? "bg-violet-600 text-white scale-110 shadow-xs"
                          : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Content & Layout Visual Editor */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Template Content &amp; Layout *
                </label>
                <TemplateVisualEditor
                  initialValue={contentHtml}
                  onChange={setContentHtml}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Type your template layout here, or use the buttons above to format headings, numbered steps, and tip boxes.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("browse")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingCustom || !name.trim() || !description.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs"
                >
                  {savingCustom && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Template
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MAIN ARTICLE EDITOR COMPONENT
// ==========================================
export default function ArticleEditor({ articleId = "new", navigate, can, user }) {
  const [currentId, setCurrentId] = useState(articleId !== "new" ? articleId : null);
  const idRef = useRef(articleId !== "new" ? articleId : null);
  const isEdit = !!(currentId || idRef.current);
  const isNew = !isEdit;

  // SWR: Fetch Article Data (if editing)
  const { data: articleData, isLoading: loadingArticle } = useSWR(
    articleId !== "new" ? `/api/kb/articles/${articleId}` : null,
    fetcher
  );

  // SWR: Fetch Categories
  const { data: catData } = useSWR("/api/kb/categories", fetcher);
  const categories = useMemo(() => catData?.categories || [], [catData]);

  // SWR: Fetch Team Members for Author selector (matches BlogEditor)
  const { data: team } = useSWR("/api/team", fetcher);

  // SWR: Fetch All Articles to detect duplicate slugs in real-time (matches BlogEditor)
  const { data: allArticlesData } = useSWR("/api/kb/articles?limit=500", fetcher);
  const allArticlesList = useMemo(() => allArticlesData?.items || [], [allArticlesData]);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [saveAndLeaveLoading, setSaveAndLeaveLoading] = useState(false);

  // Image Dialog State (Exact Blog Editor Match)
  const [imgDialog, setImgDialog] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Floating Action Toolbars for Selected Image & Video
  const [imgBar, setImgBar] = useState(null); // { img, fig, src, alt, caption, width, align }
  const [imgBarPos, setImgBarPos] = useState({ top: 0, left: 0 });

  const [videoBar, setVideoBar] = useState(null); // { wrapper, iframe, src }
  const [videoBarPos, setVideoBarPos] = useState({ top: 0, left: 0 });
  const [isCanvasActive, setIsCanvasActive] = useState(false);

  // Editor ref
  const editorRef = useRef(null);

  // Floating Text Formatting Bubble Menu State (1-to-1 Match with BlogEditor)
  const savedRange = useRef(null);
  const [fontSize, setFontSize] = useState(16);
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });
  const [textFormatOpen, setTextFormatOpen] = useState(false);
  const [textFormatPosition, setTextFormatPosition] = useState({ top: 0, left: 0 });

  const saveSel = () => {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    } catch (e) {}
  };

  const restoreSel = () => {
    try {
      if (savedRange.current) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
    } catch (e) {}
  };

  const getCurrentFontSize = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return 16;
    const container = sel.getRangeAt(0).startContainer;
    const element =
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;
    if (!element || !editorRef.current.contains(element)) return 16;
    const size = parseFloat(window.getComputedStyle(element).fontSize);
    return Number.isFinite(size) && size > 0 ? Math.round(size) : 16;
  };

  const applyInlineStyle = (property, value) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style[property] = value;
    if (range.collapsed) {
      span.appendChild(document.createTextNode("\u200b"));
      range.insertNode(span);
      range.setStart(span.firstChild, 1);
      range.collapse(true);
    } else {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      sel.addRange(nextRange);
    }
    savedRange.current = null;
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
  };

  const applyFontSize = (size) => {
    const numericSize = Number(size);
    const nextSize = Math.min(1000, Math.max(1, Math.round(numericSize)));
    if (!Number.isFinite(nextSize)) return;
    setFontSize(nextSize);
    applyInlineStyle("fontSize", `${nextSize}px`);
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      try {
        const sel = window.getSelection();
        if (
          !sel ||
          !sel.rangeCount ||
          !editorRef.current ||
          !editorRef.current.contains(sel.anchorNode)
        ) {
          setTextFormatOpen(false);
          return;
        }

        if (sel.isCollapsed) {
          setTextFormatOpen(false);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) {
          setTextFormatOpen(false);
          return;
        }

        setActiveStates({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
        });

        setFontSize(getCurrentFontSize());

        setTextFormatPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });

        savedRange.current = range.cloneRange();
        setTextFormatOpen(true);
      } catch (e) {
        setTextFormatOpen(false);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // Form State - Matches Vinimay Frontend KB Article schema 1-to-1
  const [form, setForm] = useState({
    title: "",
    slug: "",
    slugEdited: !isNew,
    categoryId: "",
    categoryName: "",
    categorySlug: "",
    author: user?.name || "",
    overview: "",
    prerequisites: [],
    contentHtml: "",
    steps: [],
    videoUrl: "",
    faqs: [{ question: "", answer: "" }],
    status: "draft",
    scheduledAt: null,
    order: 1,
    searchTags: "",
  });

  // Track unsaved dirty state and snapshot of initial loaded database data (Exact BlogEditor matching)
  const [dirty, setDirty] = useState(false);
  const initialSnapshotRef = useRef(null);

  // Keep author synchronized with current logged-in user if previously empty or old hardcoded placeholder
  useEffect(() => {
    if (user?.name && (!form.author || form.author.toLowerCase().includes("vinimay"))) {
      setForm((f) => ({ ...f, author: user.name }));
    }
  }, [user?.name]);

  // Auto-calculate next sort order for a given category based on database items
  const getNextOrderForCategory = useCallback(
    (catId) => {
      if (!catId) return 1;
      const catArticles = (allArticlesList || []).filter(
        (a) => a.categoryId === catId || a.categorySlug === catId
      );
      if (catArticles.length === 0) {
        const catObj = categories.find((c) => c.id === catId || c.slug === catId);
        return (catObj?.articleCount || 0) + 1;
      }
      const maxOrder = Math.max(
        0,
        ...catArticles.map((a) => (typeof a.order === "number" ? a.order : 0))
      );
      return Math.max(maxOrder + 1, catArticles.length + 1);
    },
    [allArticlesList, categories]
  );

  // Populate data when loaded
  useEffect(() => {
    if (articleData?.article) {
      const art = articleData.article;

      // Convert any legacy fields (overview, prerequisites, steps, video, faqs) into unified rich HTML
      const initialHtml = convertArticleToUnifiedHtml(art);

      // If existing author was the old hardcoded "Vinimay..." placeholder, replace with current logged-in user
      const rawAuthor = art.author || "";
      const isOldPlaceholder = !rawAuthor || rawAuthor.toLowerCase().includes("vinimay");
      const resolvedAuthor = isOldPlaceholder ? (user?.name || rawAuthor || "") : rawAuthor;

      const loadedFaqs =
        Array.isArray(art.faqs) && art.faqs.length > 0
          ? art.faqs
          : [{ question: "", answer: "" }];

      const loadedPrereqs =
        Array.isArray(art.prerequisites) && art.prerequisites.length > 0
          ? art.prerequisites
          : [];

      setForm({
        title: art.title || "",
        slug: art.slug || "",
        slugEdited: true,
        categoryId: art.categoryId || "",
        categoryName: art.categoryName || "",
        categorySlug: art.categorySlug || "",
        author: resolvedAuthor,
        overview: art.overview || "",
        prerequisites: loadedPrereqs,
        contentHtml: initialHtml,
        steps: Array.isArray(art.steps) ? art.steps : [],
        videoUrl: art.videoUrl || "",
        faqs: loadedFaqs,
        status: art.status || "draft",
        scheduledAt: art.scheduledAt || null,
        order: typeof art.order === "number" ? art.order : 1,
        searchTags: art.seo?.focusKeyword || (art.tags || []).join(", "),
      });

      // Record baseline snapshot of pristine database content
      initialSnapshotRef.current = JSON.stringify({
        title: (art.title || "").trim(),
        slug: (art.slug || "").trim(),
        categoryId: art.categoryId || "",
        author: resolvedAuthor.trim(),
        overview: (art.overview || "").trim(),
        contentHtml: (initialHtml || "").trim(),
        videoUrl: (art.videoUrl || "").trim(),
        status: art.status || "draft",
        scheduledAt: art.scheduledAt || null,
        searchTags: (art.seo?.focusKeyword || (art.tags || []).join(", ")).trim(),
        order: typeof art.order === "number" ? art.order : 1,
        prerequisites: loadedPrereqs.map((p) => p.trim()).filter(Boolean),
        faqs: loadedFaqs.filter((f) => f.question?.trim() || f.answer?.trim()),
      });
      setDirty(false);
      setLastSaved(art.updatedAt || art.createdAt || null);

      if (editorRef.current && initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
    } else if (isNew) {
      if (user?.name && (!form.author || form.author.toLowerCase().includes("vinimay"))) {
        setForm((f) => ({ ...f, author: user.name }));
      }
      if (form.categoryId) {
        const nextOrder = getNextOrderForCategory(form.categoryId);
        setForm((f) => ({ ...f, order: nextOrder }));
      }
    }
  }, [articleData, categories, isNew, user?.name, getNextOrderForCategory]);

  // Compute live unsaved changes (Identical to BlogEditor behavior)
  const hasChanges = useMemo(() => {
    if (isNew) {
      return !!form.title?.trim() || !!form.contentHtml?.trim();
    }
    if (dirty) return true;
    if (!initialSnapshotRef.current) return false;
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;
    const currentSnapshot = JSON.stringify({
      title: (form.title || "").trim(),
      slug: (form.slug || "").trim(),
      categoryId: form.categoryId || "",
      author: (form.author || "").trim(),
      overview: (form.overview || "").trim(),
      contentHtml: (currentHtml || "").trim(),
      videoUrl: (form.videoUrl || "").trim(),
      status: form.status || "draft",
      scheduledAt: form.scheduledAt || null,
      searchTags: (form.searchTags || "").trim(),
      order: typeof form.order === "number" ? form.order : 1,
      prerequisites: (form.prerequisites || []).map((p) => p.trim()).filter(Boolean),
      faqs: (form.faqs || []).filter((f) => f.question?.trim() || f.answer?.trim()),
    });
    return currentSnapshot !== initialSnapshotRef.current;
  }, [isNew, dirty, form]);

  // Duplicate slug detection (live, exact match with BlogEditor)
  const duplicateArticle = useMemo(() => {
    if (!form.slug) return null;
    const cleanSlug = form.slug.toLowerCase().trim();
    return (
      allArticlesList.find(
        (a) => a.slug?.toLowerCase().trim() === cleanSlug && a.id !== articleId
      ) || null
    );
  }, [form.slug, allArticlesList, articleId]);

  const isSlugDuplicate = !!duplicateArticle;

  // Title change auto-slug (only if not manually edited)
  const handleTitleChange = (val) => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: prev.slugEdited ? prev.slug : slugify(val),
    }));
  };

  // Category select change
  const handleCategoryChange = (catId) => {
    setDirty(true);
    const selected = categories.find((c) => c.id === catId);
    const nextOrder = isNew ? getNextOrderForCategory(catId) : form.order;
    setForm((prev) => ({
      ...prev,
      categoryId: catId,
      categoryName: selected?.name || "",
      categorySlug: selected?.slug || "",
      ...(isNew ? { order: nextOrder } : {}),
    }));
  };

  // Available Author List from Team API (pure active team members, exactly matching BlogEditor)
  const authorOptions = useMemo(() => {
    const list = (team || [])
      .filter((m) => m.status === "active")
      .map((m) => m.name);
    if (user?.name && !list.includes(user.name)) {
      list.unshift(user.name);
    }
    if (form.author && !list.includes(form.author)) {
      list.push(form.author);
    }
    return list;
  }, [team, user?.name, form.author]);

  // Upload files using standard /api/upload endpoint (matches Blog Editor)
  const uploadFiles = async (files) => {
    try {
      const fd = new FormData();
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          const dims = await new Promise((res) => {
            const img = new Image();
            img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => res({ w: 0, h: 0 });
            img.src = URL.createObjectURL(f);
          });
          fd.append("width", dims.w);
          fd.append("height", dims.h);
        }
        fd.append("files", f);
      }
      fd.append("folder", "Knowledge Base Images");
      const created = await api("/upload", {
        method: "POST",
        body: fd,
        raw: true,
      });
      return created || [];
    } catch (e) {
      toast.error(e.message || "Upload failed");
      return [];
    }
  };

  // Insert image from ImageDialog into editor
  const handleInsertImage = (opts) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const html = renderFigure(
      opts.url,
      opts.alt,
      opts.caption,
      opts.width,
      opts.align
    );
    execCmd("insertHTML", html);
    setImgDialog(null);
    toast.success("Image inserted into guide!");
  };

  // WYSIWYG Document Editor Commands
  const execCmd = (cmd, val = null) => {
    if (typeof document !== "undefined") {
      document.execCommand(cmd, false, val);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setForm((prev) => ({ ...prev, contentHtml: html }));
      }
    }
  };

  // Insert link
  const handleInsertLink = () => {
    const url = prompt("Enter link URL (e.g. https://vinimay.in or /knowledge-base):");
    if (url) execCmd("createLink", url);
  };

  // Insert YouTube Video Embed directly into content
  const handleInsertVideo = () => {
    const raw = prompt("Enter YouTube video link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...):");
    if (!raw) return;
    const embedUrl = getYouTubeEmbedUrl(raw.trim());
    if (!embedUrl) {
      toast.error("Please enter a valid YouTube video URL");
      return;
    }
    const videoHtml = `<div class="kb-video-wrapper" style="margin:20px 0;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);background:#000;"><div contenteditable="false" style="display:flex;align-items:center;justify-content:space-between;background:#18181b;padding:8px 14px;border-top-left-radius:14px;border-top-right-radius:14px;color:#fff;font-size:12px;user-select:none;"><span style="display:flex;align-items:center;gap:6px;font-weight:600;">🎥 YouTube Video</span><div style="display:flex;gap:8px;"><button type="button" class="kb-edit-video-btn" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Edit URL</button><button type="button" class="kb-delete-video-btn" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">Delete</button></div></div><div style="position:relative;aspect-ratio:16/9;width:100%;"><iframe src="${embedUrl}" style="width:100%;height:100%;border:0;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div><p><br/></p>`;
    execCmd("insertHTML", videoHtml);
    toast.success("YouTube video embedded into guide content!");
  };

  // Insert Tip Box into Editor
  const handleInsertTipBox = () => {
    const tipHtml = `<div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #5b21b6;"><strong>💡 Pro Tip: </strong>Enter your helpful advice here...</div><p><br/></p>`;
    execCmd("insertHTML", tipHtml);
  };

  // Drop image directly anywhere into editor
  const handleEditorDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;
    toast.info("Uploading dropped image...");
    const created = await uploadFiles(files);
    created.forEach((c) => {
      const html = renderFigure(c.url, c.alt || c.name, "", "100", "center");
      execCmd("insertHTML", html);
    });
    toast.success("Image placed in content!");
  };

  // Click handler inside editor to detect image or video selection for floating actions
  const handleEditorClick = (e) => {
    // 0. Video Edit / Delete action buttons
    const editVideoBtn = e.target.closest && e.target.closest(".kb-edit-video-btn");
    if (editVideoBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = editVideoBtn.closest(".kb-video-wrapper");
      const iframe = wrapper?.querySelector("iframe");
      if (iframe) {
        const currentSrc = iframe.getAttribute("src") || "";
        const raw = prompt("Enter new YouTube video link:", currentSrc);
        if (raw) {
          const newEmbed = getYouTubeEmbedUrl(raw.trim());
          if (newEmbed) {
            iframe.setAttribute("src", newEmbed);
            if (editorRef.current) {
              setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
            }
            toast.success("YouTube video updated successfully!");
          } else {
            toast.error("Invalid YouTube URL");
          }
        }
      }
      return;
    }

    const deleteVideoBtn = e.target.closest && e.target.closest(".kb-delete-video-btn");
    if (deleteVideoBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deleteVideoBtn.closest(".kb-video-wrapper");
      if (wrapper) {
        wrapper.remove();
        if (editorRef.current) {
          setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
        }
        toast.success("Video removed from content");
      }
      return;
    }

    // 1. Image clicked
    const img = e.target.closest && e.target.closest("img");
    if (img && editorRef.current && editorRef.current.contains(img)) {
      editorRef.current.querySelectorAll(".ss-selected-media").forEach((el) => {
        el.classList.remove("ss-selected-media");
      });
      img.classList.add("ss-selected-media");
      const fig = img.closest("figure");
      const caption = fig?.querySelector("figcaption")?.textContent || "";

      const rect = img.getBoundingClientRect();
      const parentRect = editorRef.current.parentElement.getBoundingClientRect();

      setImgBar({
        img,
        fig,
        src: img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
        caption,
        width: img.style.width ? img.style.width.replace("%", "") : "100",
        align:
          fig?.style?.textAlign === "center" || img?.style?.margin?.includes("auto")
            ? "center"
            : img?.style?.float || "center",
      });
      setImgBarPos({
        top: Math.max(10, rect.top - parentRect.top + editorRef.current.scrollTop - 44),
        left: Math.max(10, rect.left - parentRect.left + editorRef.current.scrollLeft),
      });
      setVideoBar(null);
      return;
    }

    // 2. Video / iframe / wrapper clicked
    const iframe = e.target.closest && e.target.closest("iframe");
    const videoWrapper = e.target.closest && e.target.closest(".kb-video-wrapper");
    if ((iframe || videoWrapper) && editorRef.current) {
      const wrapper = videoWrapper || iframe.closest(".kb-video-wrapper") || iframe;
      const targetIframe = iframe || wrapper.querySelector("iframe");
      const src = targetIframe?.getAttribute("src") || "";

      editorRef.current.querySelectorAll(".ss-selected-media").forEach((el) => {
        el.classList.remove("ss-selected-media");
      });
      wrapper.classList.add("ss-selected-media");

      const rect = wrapper.getBoundingClientRect();
      const parentRect = editorRef.current.parentElement.getBoundingClientRect();

      setVideoBar({
        wrapper,
        iframe: targetIframe,
        src,
      });
      setVideoBarPos({
        top: Math.max(10, rect.top - parentRect.top + editorRef.current.scrollTop - 44),
        left: Math.max(10, rect.left - parentRect.left + editorRef.current.scrollLeft),
      });
      setImgBar(null);
      return;
    }

    // Otherwise deselect
    if (editorRef.current) {
      editorRef.current.querySelectorAll(".ss-selected-media").forEach((el) => {
        el.classList.remove("ss-selected-media");
      });
    }
    setImgBar(null);
    setVideoBar(null);
  };

  // Update selected image styling (align, width)
  const handleUpdateImageStyle = (updater) => {
    if (!imgBar) return;
    updater(imgBar);
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
  };

  // Delete selected image
  const handleDeleteImage = () => {
    if (!imgBar) return;
    (imgBar.fig || imgBar.img).remove();
    setImgBar(null);
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
    toast.success("Image removed from content");
  };

  // Apply edits from ImageDialog (Alt, Caption, Dimensions, or Replaced Image URL)
  const handleApplyImageEdit = (opts) => {
    if (!imgBar?.img) return;
    const { img, fig } = imgBar;
    if (opts.url && opts.url !== img.getAttribute("src")) {
      img.setAttribute("src", opts.url);
    }
    img.setAttribute("alt", opts.alt || "");
    if (opts.width) {
      img.style.width = opts.width + "%";
    }
    if (opts.align === "center") {
      img.style.margin = "0 auto";
      img.style.display = "block";
      img.style.float = "";
      if (fig) fig.style.textAlign = "center";
    } else if (opts.align === "left") {
      img.style.float = "left";
      img.style.margin = "0 18px 12px 0";
      img.style.display = "";
      if (fig) fig.style.textAlign = "";
    } else if (opts.align === "right") {
      img.style.float = "right";
      img.style.margin = "0 0 12px 18px";
      img.style.display = "";
      if (fig) fig.style.textAlign = "";
    }
    if (fig) {
      let captionEl = fig.querySelector("figcaption");
      if (opts.caption) {
        if (!captionEl) {
          captionEl = document.createElement("figcaption");
          captionEl.style.fontSize = "12px";
          captionEl.style.color = "#6b7280";
          captionEl.style.marginTop = "6px";
          captionEl.style.textAlign = "center";
          fig.appendChild(captionEl);
        }
        captionEl.textContent = opts.caption;
      } else if (captionEl) {
        captionEl.remove();
      }
    }
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
    setImgDialog(null);
    setImgBar(null);
    toast.success("Image updated successfully!");
  };

  // Change YouTube video URL
  const handleChangeVideoUrl = () => {
    if (!videoBar?.iframe) return;
    const currentUrl = videoBar.src || "";
    const raw = prompt("Enter new YouTube video link:", currentUrl);
    if (!raw) return;
    const newEmbed = getYouTubeEmbedUrl(raw.trim());
    if (!newEmbed) {
      toast.error("Please enter a valid YouTube video URL");
      return;
    }
    videoBar.iframe.setAttribute("src", newEmbed);
    setVideoBar((prev) => (prev ? { ...prev, src: newEmbed } : null));
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
    toast.success("YouTube video updated successfully!");
  };

  // Delete YouTube video
  const handleDeleteVideo = () => {
    if (!videoBar?.wrapper) return;
    videoBar.wrapper.remove();
    setVideoBar(null);
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
    toast.success("Video removed from content");
  };

  // FAQ Management (Structured Accordion pairs)
  const handleAddFaq = () => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  };

  const handleRemoveFaq = (idx) => {
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== idx),
    }));
  };

  const handleFaqChange = (idx, field, val) => {
    setDirty(true);
    setForm((prev) => {
      const updated = [...prev.faqs];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, faqs: updated };
    });
  };

  // Insert Table (Matches BlogEditor 1-to-1)
  const handleInsertTable = () => {
    const tableHtml =
      "<table><tbody>" +
      Array.from({ length: 3 })
        .map(
          () =>
            "<tr>" +
            Array.from({ length: 3 })
              .map(() => "<td>&nbsp;</td>")
              .join("") +
            "</tr>"
        )
        .join("") +
      "</tbody></table><p></p>";
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertHTML", false, tableHtml);
      setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
    }
  };

  // Keyboard Handler for Enter, Shift+Enter, Heading Exit, and Shortcuts
  const handleEditorKeyDown = (e) => {
    // Ctrl+K / Cmd+K: Insert link
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      saveSel();
      handleInsertLink();
      return;
    }

    // Shift + Enter: Insert a clean line break (<br>) within current block
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      if (editorRef.current) {
        setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
      }
      return;
    }

    // Enter inside Heading (h1, h2, h3): cleanly exit heading and create new paragraph <p>
    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const heading = node?.closest?.("h1, h2, h3") || node?.parentElement?.closest?.("h1, h2, h3");
        if (heading && editorRef.current?.contains(heading)) {
          const range = sel.getRangeAt(0);
          if (range.collapsed) {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            if (heading.nextSibling) {
              heading.parentNode.insertBefore(p, heading.nextSibling);
            } else {
              heading.parentNode.appendChild(p);
            }
            // Move cursor inside new paragraph
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            if (editorRef.current) {
              setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
            }
            return;
          }
        }
      }
    }
  };

  // Paste Handler: Automatically preserves line breaks from copied text
  const handleEditorPaste = (e) => {
    const text = e.clipboardData?.getData("text/plain");
    const html = e.clipboardData?.getData("text/html");

    // If pasting plain text containing line breaks and no rich HTML
    if (!html && text && (text.includes("\n") || text.includes("\r"))) {
      e.preventDefault();
      const paragraphs = text
        .split(/\r?\n\r?\n/)
        .map((para) => `<p>${para.replace(/\r?\n/g, "<br>")}</p>`)
        .join("");
      document.execCommand("insertHTML", false, paragraphs);
      if (editorRef.current) {
        setForm((prev) => ({ ...prev, contentHtml: editorRef.current.innerHTML }));
      }
    }
  };

  // Save / Publish Handler
  const handleSave = async (publishNow = false, overrideFields = {}, silent = false) => {
    const resolvedStatus = publishNow
      ? "published"
      : overrideFields.status || form.status || "draft";

    const isPublishingOrScheduling =
      publishNow || resolvedStatus === "published" || resolvedStatus === "scheduled";

    // Strict validation ONLY when publishing or scheduling
    if (isPublishingOrScheduling) {
      if (!form.title.trim()) {
        if (!silent) toast.error("Please enter a guide title before publishing!");
        return false;
      }
      if (!form.slug?.trim()) {
        if (!silent) toast.error("Please enter a guide URL slug before publishing!");
        return false;
      }
      if (isSlugDuplicate) {
        if (!silent) {
          toast.error(
            `The slug "${form.slug}" is already used by "${duplicateArticle?.title || 'another guide'}". Please choose a unique slug.`
          );
        }
        return false;
      }
      if (!form.categoryId) {
        if (!silent) toast.error("Please select a category for this guide before publishing!");
        return false;
      }
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;
      const textOnly = (currentHtml || "").replace(/<[^>]*>/g, "").trim();
      const hasMedia = currentHtml?.includes("<img") || currentHtml?.includes("<iframe");
      if (!textOnly && !hasMedia) {
        if (!silent) {
          toast.error(
            "Guide Document Content cannot be empty. Please write some content or steps before publishing!"
          );
          if (editorRef.current) {
            editorRef.current.focus();
            editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        return false;
      }
    }

    const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;

    // For Draft: Title & Slug fallback gracefully so saving draft is NEVER blocked
    const resolvedTitle = form.title.trim() || "Untitled Guide";
    const resolvedSlug =
      (form.slug?.trim() || slugify(resolvedTitle) || "untitled-guide").toLowerCase();

    // Auto extract overview from first paragraph if empty
    let autoOverview = form.overview.trim();
    if (!autoOverview && currentHtml) {
      const firstPara = currentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (firstPara) autoOverview = firstPara[1].replace(/<[^>]*>/g, "").trim();
    }
    // Auto extract video URL if iframe embedded in editor
    let autoVideoUrl = form.videoUrl?.trim() || "";
    if (!autoVideoUrl && currentHtml) {
      const iframeMatch = currentHtml.match(/<iframe[^>]*src=["']([^"']*)["']/i);
      if (iframeMatch && iframeMatch[1]) {
        autoVideoUrl = iframeMatch[1];
      }
    }

    const payload = {
      ...form,
      title: resolvedTitle,
      slug: resolvedSlug,
      videoUrl: autoVideoUrl,
      contentHtml: currentHtml,
      overview: autoOverview,
      prerequisites: (form.prerequisites || []).map((p) => p.trim()).filter(Boolean),
      status: resolvedStatus,
      scheduledAt:
        overrideFields.scheduledAt !== undefined
          ? overrideFields.scheduledAt
          : form.scheduledAt,
      faqs: (form.faqs || []).filter((f) => f.question?.trim() && f.answer?.trim()),
      seo: {
        metaTitle: resolvedTitle,
        metaDescription: autoOverview,
        focusKeyword: (form.searchTags || "").trim(),
      },
      ...overrideFields,
    };

    if (publishNow) setPublishing(true);
    else setSaving(true);

    try {
      let savedArticleId = null;
      const activeId = currentId || idRef.current;
      if (!activeId) {
        const res = await api.post("/kb/articles", payload);
        savedArticleId = res?.article?.id;
        if (savedArticleId) {
          idRef.current = savedArticleId;
          setCurrentId(savedArticleId);
          window.history.replaceState(
            null,
            "",
            "/dashboard/kb-editor?articleId=" + encodeURIComponent(savedArticleId)
          );
        }
        if (!silent) {
          toast.success(
            publishNow
              ? "Guide published live on Vinimay!"
              : resolvedStatus === "scheduled"
              ? "Guide scheduled successfully!"
              : "Guide draft saved successfully!"
          );
        }
      } else {
        await api.put(`/kb/articles/${activeId}`, payload);
        savedArticleId = activeId;
        if (!silent) {
          toast.success(
            publishNow
              ? "Guide updated & published live!"
              : resolvedStatus === "scheduled"
              ? "Guide scheduled successfully!"
              : "Guide changes saved successfully!"
          );
        }
      }

      setLastSaved(new Date().toISOString());
      setDirty(false);
      initialSnapshotRef.current = JSON.stringify({
        title: (payload.title || "").trim(),
        slug: (payload.slug || "").trim(),
        categoryId: payload.categoryId || "",
        author: (payload.author || "").trim(),
        overview: (payload.overview || "").trim(),
        contentHtml: (payload.contentHtml || "").trim(),
        videoUrl: (payload.videoUrl || "").trim(),
        status: payload.status || "draft",
        scheduledAt: payload.scheduledAt || null,
        searchTags: (payload.searchTags || "").trim(),
        order: typeof payload.order === "number" ? payload.order : 1,
        prerequisites: (payload.prerequisites || []).map((p) => p.trim()).filter(Boolean),
        faqs: (payload.faqs || []).filter((f) => f.question?.trim() || f.answer?.trim()),
      });
      setForm((prev) => ({
        ...prev,
        status: payload.status,
        scheduledAt: payload.scheduledAt,
      }));
      window.dispatchEvent(new Event("ss-refresh"));
      return savedArticleId;
    } catch (err) {
      if (!silent) toast.error(err.message || "Failed to save guide");
      return false;
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  // Leave Confirmation Handler ("Save & Leave" action)
  const handleSaveAndLeave = async () => {
    setSaveAndLeaveLoading(true);
    try {
      const savedId = await handleSave(false, {}, false);
      if (savedId) {
        setLeaveConfirmOpen(false);
        setDirty(false);
        navigate("kb");
      }
    } catch (e) {
    } finally {
      setSaveAndLeaveLoading(false);
    }
  };

  // Unsaved changes tab-close guard (prevents accidental tab close or refresh)
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasChanges || dirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges, dirty]);

  // Autosave to DB (only for drafts, not for published guides to prevent accidental live changes)
  useEffect(() => {
    if (
      !dirty ||
      saving ||
      publishing ||
      form.status === "published"
    ) {
      return;
    }
    const t = setTimeout(() => {
      handleSave(false, {}, true); // silent = true
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, saving, publishing]);

  // Apply template to editor canvas (either replace or append)
  const handleApplyTemplate = (tmpl, mode = "replace") => {
    let nextHtml = tmpl.contentHtml;
    if (mode === "append" && editorRef.current) {
      nextHtml = `${editorRef.current.innerHTML}<hr style="margin:24px 0;border:0;border-top:1px dashed #d1d5db;"/><p><br/></p>${tmpl.contentHtml}`;
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }

    // Only update canvas document contentHtml; DO NOT touch user FAQs
    setDirty(true);
    setForm((prev) => ({
      ...prev,
      contentHtml: nextHtml,
    }));

    toast.success(`Template "${tmpl.name}" loaded into canvas!`);
  };

  const wordCount = useMemo(() => {
    const text = stripToText(form.contentHtml);
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [form.contentHtml]);

  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const outlineHeadings = useMemo(() => extractHeadings(form.contentHtml), [form.contentHtml]);

  if (loadingArticle) {
    return (
      <div className="p-20 text-center flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Loading guide editor...
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(form.videoUrl);
  const currentCat = categories.find((c) => c.id === form.categoryId);
  const currentCatSlug = currentCat?.slug || form.categorySlug || "getting-started";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* ==================================================== */}
      {/* TOP HEADER BAR (Documentation / Knowledge Base UI)   */}
      {/* ==================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        {/* Left: Back button & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (hasChanges || dirty) {
                setLeaveConfirmOpen(true);
              } else {
                navigate("kb");
              }
            }}
            className="h-9 w-9 shrink-0 hover:bg-muted"
            title="Back to Knowledge Base"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                Knowledge Base
              </span>
              <span className="text-muted-foreground/60 text-xs">/</span>
              <span className="text-xs text-muted-foreground font-medium truncate">
                {currentCat?.name || "Module"}
              </span>
              <span className="text-muted-foreground/60 text-xs">/</span>
              <StatusBadge status={form.status || "draft"} />
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate mt-0.5">
              {form.title || (isNew ? "Create New Knowledge Base Guide" : "Edit Guide")}
            </h1>

            {(saving || lastSaved) && (
              <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>{"Saved " + (TIME_AGO_SHORT ? TIME_AGO_SHORT(lastSaved) : "just now")}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Action Buttons (Exact BlogEditor matching UX) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 1. Save Changes / Save Draft Button */}
          <Button
            variant="outline"
            size="sm"
            className={`h-9 text-xs font-medium ${
              form.status === "published" && !hasChanges
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={() => handleSave(false)}
            disabled={
              saving || publishing || (form.status === "published" && !hasChanges)
            }
            title={
              form.status === "published" && !hasChanges
                ? "All changes saved"
                : form.status === "draft"
                ? "Save Draft"
                : "Save Changes"
            }
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">
              {form.status === "draft" ? "Save Draft" : "Save Changes"}
            </span>
          </Button>

          {/* 2. Schedule / Reschedule */}
          <Button
            variant="outline"
            size="sm"
            disabled={saving || publishing}
            onClick={() => {
              if (!form.categoryId) {
                toast.error("Please select a category before scheduling");
                return;
              }
              const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;
              const textOnly = (currentHtml || "").replace(/<[^>]*>/g, "").trim();
              const hasMedia = currentHtml?.includes("<img") || currentHtml?.includes("<iframe");
              if (!textOnly && !hasMedia) {
                toast.error("Guide Document Content cannot be empty before scheduling!");
                if (editorRef.current) {
                  editorRef.current.focus();
                  editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                return;
              }
              setScheduleOpen(true);
            }}
            className="h-9 text-xs font-medium hover:bg-muted"
          >
            <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
            <span className="hidden sm:inline">
              {form.status === "scheduled" || form.status === "published"
                ? "Reschedule"
                : "Schedule"}
            </span>
          </Button>

          {/* 3. Publish now / Update now Button (Blurred/Disabled until changes made if published) */}
          <Button
            size="sm"
            className={`h-9 text-xs font-semibold ${
              form.status === "published" && !hasChanges
                ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border border-border hover:bg-muted"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white shadow-md shadow-violet-500/25"
            }`}
            disabled={
              saving || publishing || (form.status === "published" && !hasChanges)
            }
            onClick={() => {
              if (form.status === "published" && !hasChanges) return;
              if (!form.categoryId) {
                toast.error("Please select a category before publishing!");
                return;
              }
              const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;
              const textOnly = (currentHtml || "").replace(/<[^>]*>/g, "").trim();
              const hasMedia = currentHtml?.includes("<img") || currentHtml?.includes("<iframe");
              if (!textOnly && !hasMedia) {
                toast.error(
                  "Guide Document Content cannot be empty. Please write some content or steps before publishing!"
                );
                if (editorRef.current) {
                  editorRef.current.focus();
                  editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                return;
              }
              handleSave(true);
            }}
            title={
              form.status === "published" && !hasChanges
                ? "Guide is published and up to date"
                : form.status === "published"
                ? "Update published guide"
                : "Publish guide"
            }
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">
              {form.status === "published" ? "Update now" : "Publish now"}
            </span>
          </Button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MAIN 2-COLUMN SPLIT: Content Body (8) & Settings (4) */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================== */}
        {/* LEFT COLUMN (8 cols): Title, Overview, Content etc. */}
        {/* ================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Guide Title & Essential Metadata Card */}
          <Card className="border-border shadow-xs">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <Labeled label="Guide title" required>
                <Input
                  placeholder="e.g. How to Add Unlimited Custom Business Fields to Invoices"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-base font-semibold"
                />
              </Labeled>

              {/* Category and Author Row (Exact BlogEditor UI match) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Labeled label="Category" required>
                  <Select value={form.categoryId || ""} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>

                <Labeled label="Author" required>
                  <Select
                    value={form.author || ""}
                    onValueChange={(val) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, author: val }));
                    }}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      {authorOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>

              {/* Live URL Slug Bar with Realtime Duplicate Detection */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Public Guide URL (Unique Slug)
                  </label>
                  {form.slug && !isSlugDuplicate && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Slug Available
                    </span>
                  )}
                  {isSlugDuplicate && (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Duplicate Slug
                    </span>
                  )}
                </div>

                <div
                  className={`flex items-center gap-1.5 text-xs rounded-lg border transition-colors px-3 py-2 ${
                    isSlugDuplicate
                      ? "border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
                      : "border-border/70 bg-muted/30 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20"
                  }`}
                >
                  <span className="font-mono text-muted-foreground/80 shrink-0 select-none">
                    vinimay.in/knowledge-base/{currentCatSlug}/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      const cleanValue = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "");
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        slug: cleanValue,
                        slugEdited: true,
                      }));
                    }}
                    onBlur={() => {
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        slug: slugify(prev.slug),
                      }));
                    }}
                    className="bg-transparent font-mono text-violet-700 dark:text-violet-400 font-semibold outline-none flex-1 min-w-0"
                    placeholder="your-guide-slug"
                  />
                </div>

                {isSlugDuplicate && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-start gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      This slug is already used by another guide (<strong>&ldquo;{duplicateArticle?.title || "Existing Guide"}&rdquo;</strong>). Saving is blocked — please choose a unique slug.
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Overview / Short Summary Card (Exact Vinimay Frontend Match) */}
          {/* 2. Unified Knowledge Base Document Canvas (Modern CMS Editor) */}
          <Card className="border-border shadow-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Guide Document Content</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Write any headings, bullet points, callout boxes, and embed videos or images anywhere in your guide.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium font-mono">
                {wordCount} words · {readTime} min read
              </span>
            </div>

            {/* Rich Document Formatting Toolbar (1-to-1 Match with Blog Editor) */}
            <div className="sticky top-0 z-20 flex items-center gap-1 px-4 py-2.5 bg-card/95 backdrop-blur border-b border-border flex-wrap">
              {/* Headings */}
              <button
                type="button"
                title="Paragraph"
                onClick={() => execCmd("formatBlock", "<p>")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-sm"
              >
                <Pilcrow className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Heading 1"
                onClick={() => execCmd("formatBlock", "<h1>")}
                className="h-8 px-2 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                <span className="text-[13px] font-bold">H1</span>
              </button>
              <button
                type="button"
                title="Heading 2"
                onClick={() => execCmd("formatBlock", "<h2>")}
                className="h-8 px-2 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Heading 3"
                onClick={() => execCmd("formatBlock", "<h3>")}
                className="h-8 px-2 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                <Heading3 className="h-4 w-4" />
              </button>

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Text Formatting */}
              <button
                type="button"
                title="Bold (Ctrl+B)"
                onClick={() => execCmd("bold")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-sm"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Italic (Ctrl+I)"
                onClick={() => execCmd("italic")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground italic text-sm font-serif"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Underline (Ctrl+U)"
                onClick={() => execCmd("underline")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground underline text-sm"
              >
                <Underline className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Strikethrough"
                onClick={() => execCmd("strikeThrough")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground line-through text-sm"
              >
                <Strikethrough className="h-4 w-4" />
              </button>

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Lists & Structure */}
              <button
                type="button"
                title="Bullet List"
                onClick={() => execCmd("insertUnorderedList")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Numbered List"
                onClick={() => execCmd("insertOrderedList")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Blockquote"
                onClick={() => execCmd("formatBlock", "<blockquote>")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Quote className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Code Block"
                onClick={() => execCmd("formatBlock", "<pre>")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Code2 className="h-4 w-4" />
              </button>

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Links & Media & Insertions */}
              <button
                type="button"
                title="Insert Link (Ctrl+K)"
                onClick={handleInsertLink}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Remove Link"
                onClick={() => execCmd("unlink")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Link2Off className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Insert Image (Paste URL, Upload, or Library)"
                onClick={() => setImgDialog({ mode: "content" })}
                className="h-8 px-2.5 rounded-md flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                <span>Image</span>
              </button>
              <button
                type="button"
                title="Embed YouTube Video"
                onClick={handleInsertVideo}
                className="h-8 px-2.5 rounded-md flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                <Video className="h-3.5 w-3.5 text-red-500" />
                <span>Video</span>
              </button>
              <button
                type="button"
                title="Use / Save Guide Templates"
                onClick={() => setTemplateModalOpen(true)}
                className="h-8 px-2.5 rounded-md flex items-center gap-1.5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold transition-colors border border-violet-500/30"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span>Template</span>
              </button>
              <button
                type="button"
                title="Insert Table (3x3)"
                onClick={handleInsertTable}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Table className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Divider (Horizontal Rule)"
                onClick={() => execCmd("insertHorizontalRule")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Alignments */}
              <button
                type="button"
                title="Align Left"
                onClick={() => execCmd("justifyLeft")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Align Center"
                onClick={() => execCmd("justifyCenter")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Align Right"
                onClick={() => execCmd("justifyRight")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <AlignRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Justify (Equal left & right edges)"
                onClick={() => execCmd("justifyFull")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <AlignJustify className="h-4 w-4" />
              </button>

              <Separator orientation="vertical" className="h-5 mx-0.5" />

              {/* Clear & History */}
              <button
                type="button"
                title="Clear Formatting"
                onClick={() => execCmd("removeFormat")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Undo (Ctrl+Z)"
                onClick={() => execCmd("undo")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Redo (Ctrl+Y)"
                onClick={() => execCmd("redo")}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>

            {/* Editable Content Canvas (Exact 1-to-1 Match with BlogEditor) */}
            <div className="relative">
              {/* Floating Image Action Bar */}
              {imgBar && (
                <div
                  className="absolute z-30 rounded-xl border border-violet-200 dark:border-violet-900 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs shadow-xl animate-in fade-in"
                  style={{ top: imgBarPos.top, left: imgBarPos.left }}
                >
                  <span className="font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1 mr-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Image
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 hover:border-violet-400"
                    onClick={() => setImgDialog({ mode: "edit-image", img: imgBar })}
                  >
                    <Edit3 className="w-3 h-3 text-violet-500" />
                    Edit / Replace
                  </Button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  {/* Width options */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.width = "50%";
                      })
                    }
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.width = "75%";
                      })
                    }
                  >
                    75%
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.width = "100%";
                      })
                    }
                  >
                    100%
                  </Button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  {/* Alignment buttons */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Float Left"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.float = "left";
                        b.img.style.margin = "0 18px 12px 0";
                        b.img.style.display = "";
                        if (b.fig) b.fig.style.textAlign = "";
                      })
                    }
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Center"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.float = "";
                        b.img.style.margin = "0 auto";
                        b.img.style.display = "block";
                        if (b.fig) b.fig.style.textAlign = "center";
                      })
                    }
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Float Right"
                    onClick={() =>
                      handleUpdateImageStyle((b) => {
                        b.img.style.float = "right";
                        b.img.style.margin = "0 0 12px 18px";
                        b.img.style.display = "";
                        if (b.fig) b.fig.style.textAlign = "";
                      })
                    }
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  {/* Delete Image */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                    onClick={handleDeleteImage}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>

                  {/* Close toolbar */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.querySelectorAll(".ss-selected-media").forEach((el) => {
                          el.classList.remove("ss-selected-media");
                        });
                      }
                      setImgBar(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Floating Video Action Bar */}
              {videoBar && (
                <div
                  className="absolute z-30 rounded-xl border border-red-200 dark:border-red-900 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs shadow-xl animate-in fade-in"
                  style={{ top: videoBarPos.top, left: videoBarPos.left }}
                >
                  <span className="font-semibold text-red-600 flex items-center gap-1 mr-1">
                    <Video className="w-3.5 h-3.5" />
                    YouTube Video
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 hover:border-red-400"
                    onClick={handleChangeVideoUrl}
                  >
                    <Edit3 className="w-3 h-3 text-red-500" />
                    Change Link
                  </Button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  {/* Delete Video */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                    onClick={handleDeleteVideo}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Video
                  </Button>

                  {/* Close toolbar */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.querySelectorAll(".ss-selected-media").forEach((el) => {
                          el.classList.remove("ss-selected-media");
                        });
                      }
                      setVideoBar(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* FLOATING TEXT FORMATTING BUBBLE (Exact 1-to-1 Match with BlogEditor) */}
              {textFormatOpen && (
                <div
                  className="fixed z-50 flex items-center gap-1 rounded-lg border bg-background p-1.5 shadow-lg animate-in fade-in"
                  style={{
                    top: textFormatPosition.top,
                    left: textFormatPosition.left,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  {/* Font Size Stepper */}
                  <div className="flex items-center rounded-md border border-border">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveSel();
                        applyFontSize(getCurrentFontSize() - 1);
                      }}
                      className="h-8 w-8 text-sm flex items-center justify-center hover:bg-accent text-foreground"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={fontSize}
                      onMouseDown={saveSel}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (
                          Number.isInteger(value) &&
                          value > 0 &&
                          value <= 1000
                        ) {
                          applyFontSize(value);
                        }
                      }}
                      className="h-8 w-12 border-x border-border bg-transparent text-center text-xs outline-none text-foreground font-mono"
                    />

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveSel();
                        applyFontSize(getCurrentFontSize() + 1);
                      }}
                      className="h-8 w-8 text-sm flex items-center justify-center hover:bg-accent text-foreground"
                    >
                      +
                    </button>
                  </div>

                  {/* Bold */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSel();
                      execCmd("bold");
                      setActiveStates((prev) => ({ ...prev, bold: !prev.bold }));
                    }}
                    className={`h-8 w-8 rounded-md text-sm font-bold flex items-center justify-center hover:bg-accent transition-colors ${
                      activeStates.bold
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        : "text-foreground"
                    }`}
                  >
                    B
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSel();
                      execCmd("italic");
                      setActiveStates((prev) => ({ ...prev, italic: !prev.italic }));
                    }}
                    className={`h-8 w-8 rounded-md text-sm italic font-serif flex items-center justify-center hover:bg-accent transition-colors ${
                      activeStates.italic
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        : "text-foreground"
                    }`}
                  >
                    I
                  </button>

                  {/* Underline */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSel();
                      execCmd("underline");
                      setActiveStates((prev) => ({ ...prev, underline: !prev.underline }));
                    }}
                    className={`h-8 w-8 rounded-md text-sm underline flex items-center justify-center hover:bg-accent transition-colors ${
                      activeStates.underline
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        : "text-foreground"
                    }`}
                  >
                    U
                  </button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  {/* Convert selected text to Link */}
                  <button
                    type="button"
                    title="Turn selected text into link (Ctrl+K)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSel();
                      setTextFormatOpen(false);
                      handleInsertLink();
                    }}
                    className="h-8 px-2 flex items-center gap-1.5 rounded-md text-xs font-medium hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300 transition-colors text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5 text-violet-500" />
                    <span>Link</span>
                  </button>
                </div>
              )}

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => {
                  setIsCanvasActive(true);
                  try {
                    document.execCommand("defaultParagraphSeparator", false, "p");
                  } catch (err) {}
                }}
                onBlur={() => {
                  saveSel();
                  setTimeout(() => {
                    if (
                      !editorRef.current ||
                      !document.activeElement ||
                      !editorRef.current.contains(document.activeElement)
                    ) {
                      setIsCanvasActive(false);
                    }
                  }, 120);
                }}
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
                onPaste={handleEditorPaste}
                onMouseUp={saveSel}
                onInput={() => {
                  setDirty(true);
                  if (editorRef.current) {
                    setForm((prev) => ({
                      ...prev,
                      contentHtml: editorRef.current.innerHTML,
                    }));
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleEditorDrop}
                className="editor-area prose-studio px-6 lg:px-8 py-6 max-w-full overflow-x-hidden min-h-[520px] text-foreground text-sm sm:text-base leading-relaxed
                  [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-3
                  [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-2.5 [&>h2]:pb-1.5 [&>h2]:border-b [&>h2]:border-border/40
                  [&>h3]:text-base [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-1.5
                  [&>p]:mb-3 [&>p]:leading-relaxed
                  [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1.5
                  [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-2
                  [&>blockquote]:border-l-4 [&>blockquote]:border-violet-500 [&>blockquote]:pl-4 [&>blockquote]:py-1 [&>blockquote]:my-3 [&>blockquote]:italic [&>blockquote]:text-muted-foreground
                  [&>img]:rounded-xl [&>img]:my-4 [&>img]:max-w-full [&>img]:border [&>img]:border-border [&>img]:shadow-xs
                  [&_.ss-selected-media]:ring-2 [&_.ss-selected-media]:ring-violet-500 [&_.ss-selected-media]:ring-offset-2 [&_.ss-selected-media]:rounded-xl"
                placeholder="Start writing your guide... Type headings, bullet points, drop screenshots, and embed videos freely anywhere in your guide."
              />
            </div>
          </Card>

          {/* Card 3: Frequently Asked Questions (Structured Accordions) */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Frequently Asked Questions (FAQs)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Add common questions &amp; answers. These render as an interactive accordion on the article page.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFaq}
                className="text-xs font-semibold rounded-xl border-dashed border-border hover:border-foreground text-foreground"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {form.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      FAQ #{idx + 1}
                    </span>
                    {form.faqs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFaq(idx)}
                        className="text-muted-foreground hover:text-red-600 h-7 w-7 p-0 rounded-lg"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Question
                    </label>
                    <Input
                      value={faq.question}
                      onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                      placeholder="e.g. Can I configure custom fields for each invoice individually?"
                      className="rounded-xl border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Answer
                    </label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                      rows={2}
                      placeholder="Provide a clear, helpful answer..."
                      className="rounded-xl border-border bg-background"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN (4 cols, Sticky): Guide Inspector     */}
        {/* ================================================== */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Card 1: Guide Details & Publishing Inspector */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-violet-600" />
                Guide Publishing Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Status Row */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <Select
                    value={form.status || "draft"}
                    onValueChange={(val) => {
                      if (val === "published" || val === "scheduled") {
                        if (!form.categoryId) {
                          toast.error("Please select a category first");
                          return;
                        }
                        const currentHtml = editorRef.current ? editorRef.current.innerHTML : form.contentHtml;
                        const textOnly = (currentHtml || "").replace(/<[^>]*>/g, "").trim();
                        const hasMedia = currentHtml?.includes("<img") || currentHtml?.includes("<iframe");
                        if (!textOnly && !hasMedia) {
                          toast.error("Guide Document Content cannot be empty before setting status to " + val);
                          if (editorRef.current) {
                            editorRef.current.focus();
                            editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                          return;
                        }
                      }
                      setDirty(true);
                      if (val === "scheduled" && !form.scheduledAt) {
                        setScheduleOpen(true);
                      }
                      setForm((prev) => ({ ...prev, status: val }));
                    }}
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.status === "scheduled" && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-violet-500" />
                      Publish at:
                    </span>
                    <Input
                      type="datetime-local"
                      value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""}
                      onChange={(e) => {
                        setDirty(true);
                        setForm((prev) => ({
                          ...prev,
                          scheduledAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }));
                      }}
                      className="h-7 text-[11px] font-mono w-44"
                    />
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Module</span>
                <span className="font-semibold text-foreground truncate max-w-[170px]">
                  {currentCat?.name || "General"}
                </span>
              </div>

              {/* Display Order */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Sort Order</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={form.order}
                    onChange={(e) => {
                      setDirty(true);
                      setForm({ ...form, order: parseInt(e.target.value) || 1 });
                    }}
                    className="w-16 h-7 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Author */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Author</span>
                <span className="font-medium text-foreground truncate max-w-[170px]">
                  {form.author}
                </span>
              </div>

              {/* Word Count */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground font-medium">Content Length</span>
                <span className="font-mono text-muted-foreground">
                  {wordCount} words ({readTime} min read)
                </span>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                {!isNew && form.status === "published" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-9 justify-center font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => {
                      if (form.slug) {
                        window.open(
                          `http://localhost:8678/knowledge-base/${currentCatSlug}/${form.slug}`,
                          "_blank"
                        );
                      }
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    View Live on Vinimay Reader
                  </Button>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      {isNew
                        ? "Guide is not published yet. Click \"Publish Guide\" to view live on Vinimay Reader."
                        : form.status === "scheduled"
                        ? `Guide is scheduled to publish on ${form.scheduledAt ? new Date(form.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "the scheduled time"}.`
                        : form.status === "archived"
                        ? "Guide is currently Archived. Restore to Draft or Publish to make it active."
                        : "Guide is currently in Draft mode. Publish the guide to view it live on Vinimay Reader."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Help Center Search Keywords */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-violet-600" />
                Help Center Search Tags
              </CardTitle>
              <CardDescription className="text-xs">
                Comma-separated keywords so users can easily discover this guide in the search box.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. invoice, custom fields, company profile"
                value={form.searchTags}
                onChange={(e) => {
                  setDirty(true);
                  setForm({ ...form, searchTags: e.target.value });
                }}
                className="text-xs h-9"
              />
            </CardContent>
          </Card>

          {/* Card 3: Live Table of Contents / Outline */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <List className="w-4 h-4 text-violet-600" />
                Guide Table of Contents
              </CardTitle>
              <CardDescription className="text-xs">
                Headings detected from your content for the reader's right-hand scroll-spy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outlineHeadings.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No headings (H1, H2, H3) detected yet. Use the toolbar heading buttons to structure sections.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {outlineHeadings.map((h, idx) => (
                    <div
                      key={idx}
                      className={`text-xs py-1 px-2 rounded-md hover:bg-muted transition-colors truncate ${
                        h.level === "h1"
                          ? "font-bold text-foreground"
                          : h.level === "h2"
                          ? "pl-4 font-semibold text-foreground/90"
                          : "pl-6 text-muted-foreground"
                      }`}
                    >
                      {h.text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Dialog (Paste URL, Upload, Library - 1-to-1 Blog Editor Match) */}
      <ImageDialog
        state={imgDialog}
        onClose={() => setImgDialog(null)}
        onUpload={async (files) => (await uploadFiles(files))[0]}
        onInsert={handleInsertImage}
        onApply={handleApplyImageEdit}
      />

      {/* Guide Templates Dialog (Browse Built-in & Save Custom Canvas Templates) */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        currentContent={editorRef.current?.innerHTML || form.contentHtml}
        currentFaqs={form.faqs}
      />

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        blogTitle={form.title}
        status={form.status}
        scheduledAt={form.scheduledAt}
        onConfirm={async (iso) => {
          const scheduledAt = typeof iso === "string" ? iso : iso?.scheduledAt;
          setForm((prev) => ({ ...prev, status: "scheduled", scheduledAt }));
          setScheduleOpen(false);
          await handleSave(false, { status: "scheduled", scheduledAt });
        }}
        loading={saving}
      />

      {/* Leave Confirmation Dialog (Matches BlogEditor 1-to-1) */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Unsaved changes in guide
                </DialogTitle>
                <DialogDescription className="text-xs">
                  You have unsaved changes. What would you like to do before leaving?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-1 text-xs text-muted-foreground">
            If you leave without saving, your recent edits will be lost and not updated on the server.
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLeaveConfirmOpen(false)}
              disabled={saveAndLeaveLoading}
              className="text-xs order-3 sm:order-1"
            >
              Stay in Editor
            </Button>
            <div className="flex items-center gap-2 justify-end order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                onClick={() => {
                  setLeaveConfirmOpen(false);
                  setDirty(false);
                  navigate("kb");
                }}
                disabled={saveAndLeaveLoading}
              >
                Leave without saving
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium gap-1.5 shadow-xs"
                onClick={handleSaveAndLeave}
                disabled={saveAndLeaveLoading}
              >
                {saveAndLeaveLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save & Leave
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
