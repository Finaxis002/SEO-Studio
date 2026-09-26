"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Pencil,
  Save,
  Sun,
  Trash2,
  Plus,
  Bot,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Folder,
  Tag,
  Search,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog, Labeled } from "../bits";
import { api, fetcher, initials } from "@/lib/client";
import { useTheme } from "next-themes";

export default function SettingsView({
  tab: initialTab,
  user,
  canManageSettings = true,
}) {
  const vinimayUrl =
    process.env.NEXT_PUBLIC_VINIMAY_URL || "https://vinimay.sharda.co.in";
  const [tab, setTab] = useState(
    canManageSettings ? initialTab || "general" : "profile",
  );
  const { data: s, mutate } = useSWR(
    canManageSettings ? "/api/settings" : null,
    fetcher,
  );
  const { data: options } = useSWR(
    canManageSettings ? "/api/settings-options" : null,
    fetcher,
  );
  const { data: contentOptions, mutate: mutateContentOptions } = useSWR(
    canManageSettings ? "/api/content-options" : null,
    fetcher,
  );
  const [form, setForm] = useState(
    canManageSettings
      ? null
      : { general: {}, seo: {}, llm: {}, publishing: {} },
  );
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [subcategoryCategory, setSubcategoryCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubcategoryOpen, setAddSubcategoryOpen] = useState(false);
  const [addBotOpen, setAddBotOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotAgent, setNewBotAgent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [taxonomyTab, setTaxonomyTab] = useState("categories");
  const [taxonomySearch, setTaxonomySearch] = useState("");
  const { theme, setTheme } = useTheme();

  const categoriesList = (contentOptions?.categories || []).filter((c) =>
    (c || "")
      .toLowerCase()
      .includes((taxonomySearch || "").toLowerCase().trim()),
  );
  const subcategoriesList = (contentOptions?.subcategories || []).filter((sc) =>
    (sc || "")
      .toLowerCase()
      .includes((taxonomySearch || "").toLowerCase().trim()),
  );

  useEffect(() => {
    setTab(canManageSettings ? initialTab || "general" : "profile");
  }, [initialTab, canManageSettings]);
  useEffect(() => {
    if (s && !form && canManageSettings)
      setForm({
        general: s.general || {},
        seo: s.seo || {},
        llm: s.llm || { enabled: true, includeBlogs: true, summary: "" },
        publishing: s.publishing || {},
      });
  }, [s, canManageSettings]); // eslint-disable-line

  if (!form && canManageSettings && tab !== "profile")
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );

  const save = async (section) => {
    try {
      await api("/settings", { method: "PUT", body: form });
      toast.success(section + " settings saved");
      mutate();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const upG = (k, v) =>
    setForm({ ...form, general: { ...form.general, [k]: v } });
  const upS = (k, v) => setForm({ ...form, seo: { ...form.seo, [k]: v } });
  const upL = (k, v) =>
    setForm({ ...form, llm: { ...(form.llm || {}), [k]: v } });
  const upP = (k, v) =>
    setForm({ ...form, publishing: { ...form.publishing, [k]: v } });

  const aiCrawlers = form?.seo?.aiCrawlers || [];

  const toggleCrawler = (id) => {
    const updated = aiCrawlers.map((c) =>
      c.id === id ? { ...c, allowed: !c.allowed } : c,
    );
    upS("aiCrawlers", updated);
  };

  const deleteCrawler = (id) => {
    const updated = aiCrawlers.filter((c) => c.id !== id);
    upS("aiCrawlers", updated);
    toast.success("AI Crawler removed");
  };

  const addCrawler = () => {
    if (!newBotAgent.trim()) {
      toast.error("User-Agent is required");
      return;
    }
    const newBot = {
      id: "bot-" + Date.now(),
      name: newBotName.trim() || newBotAgent.trim(),
      userAgent: newBotAgent.trim(),
      allowed: true,
    };
    const updated = [...aiCrawlers, newBot];
    upS("aiCrawlers", updated);
    setNewBotName("");
    setNewBotAgent("");
    setAddBotOpen(false);
    toast.success("AI Crawler added");
  };

  const generateRobotsTemplate = () => {
    const lines = [
      "User-agent: *",
      "Allow: /",
      "",
      "# Block private, auth & internal search pages",
      "Disallow: /login",
      "Disallow: /signup",
      "Disallow: /dashboard",
      "Disallow: /admin",
      "Disallow: /api",
      "Disallow: /?s=",
      "Disallow: /*?s=",
      "Disallow: /search/",
      "",
      "# Explicitly allow major AI crawlers",
      "",
    ];

    const crawlers = form?.seo?.aiCrawlers || [];

    // Group crawlers if possible or list them cleanly
    crawlers.forEach((c) => {
      lines.push(`User-agent: ${c.userAgent}`);
      lines.push(c.allowed ? "Allow: /" : "Disallow: /");
      lines.push("");
    });

    lines.push("# Sitemap");
    lines.push("Sitemap: https://vinimay.sharda.co.in/sitemap.xml");
    lines.push("");
    lines.push("# AI-readable website files");
    lines.push("# https://vinimay.sharda.co.in/llms.txt");

    upS("robotsTxt", lines.join("\n"));
    toast.success("Robots.txt compiled from AI crawlers and rules");
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api("/categories", {
        method: "POST",
        body: { name: newCategory },
      });
      setNewCategory("");
      mutateContentOptions();
      setAddCategoryOpen(false);
      toast.success("Category added");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addSubcategory = async () => {
    if (!newSubcategory.trim()) return;
    try {
      await api("/subcategories", {
        method: "POST",
        body: { name: newSubcategory, category: subcategoryCategory },
      });
      setNewSubcategory("");
      setSubcategoryCategory("");
      mutateContentOptions();
      setAddSubcategoryOpen(false);
      toast.success("Subcategory added");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const updateContentOption = async (type, oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) {
      if (type === "category") setEditingCategory(null);
      else setEditingSubcategory(null);
      return;
    }
    try {
      await api("/" + (type === "category" ? "categories" : "subcategories"), {
        method: "PUT",
        body: { oldName, newName: newName.trim() },
      });
      mutateContentOptions();
      toast.success(
        type === "category" ? "Category updated" : "Subcategory updated",
      );
      if (type === "category") setEditingCategory(null);
      else setEditingSubcategory(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteContentOption = async (type, name) => {
    try {
      await api("/" + (type === "category" ? "categories" : "subcategories"), {
        method: "DELETE",
        body: { name },
      });
      mutateContentOptions();
      toast.success(
        type === "category" ? "Category deleted" : "Subcategory deleted",
      );
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up max-w-6xl">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">
          {canManageSettings ? "Settings" : "Profile & Preferences"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {canManageSettings
            ? "Workspace configuration and your profile."
            : "Manage your personal account details and appearance."}
        </p>
      </div>

      {canManageSettings && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9 justify-start overflow-x-auto w-full bg-muted/60 p-1">
            <TabsTrigger value="general" className="text-xs px-3 h-7">
              General
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs px-3 h-7">
              SEO
            </TabsTrigger>
            <TabsTrigger value="publishing" className="text-xs px-3 h-7">
              Publishing
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs px-3 h-7">
              Profile
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              Add a category for the Blog Editor.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category name"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCategory}>Add category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addSubcategoryOpen} onOpenChange={setAddSubcategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add subcategory</DialogTitle>
            <DialogDescription>
              Optionally associate this subcategory with a category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              placeholder="Subcategory name"
              onKeyDown={(e) => e.key === "Enter" && addSubcategory()}
            />
            <Select
              value={subcategoryCategory}
              onValueChange={setSubcategoryCategory}
            >
              <SelectTrigger className="bg-muted/30">
                <SelectValue placeholder="Category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {(contentOptions?.categories || []).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSubcategoryOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addSubcategory}>Add subcategory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addBotOpen} onOpenChange={setAddBotOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add AI Crawler</DialogTitle>
            <DialogDescription>
              Add a bot by its User-Agent string. Toggle Allow/Block after
              adding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              placeholder="Display name (e.g. GPTBot)"
            />
            <Input
              value={newBotAgent}
              onChange={(e) => setNewBotAgent(e.target.value)}
              placeholder="User-Agent (e.g. GPTBot)"
              onKeyDown={(e) => e.key === "Enter" && addCrawler()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBotOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCrawler}>Add Crawler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Rename this category across the workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={editingCategory?.name || ""}
            onChange={(e) =>
              setEditingCategory({ ...editingCategory, name: e.target.value })
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              updateContentOption(
                "category",
                editingCategory.oldName,
                editingCategory.name,
              )
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateContentOption(
                  "category",
                  editingCategory.oldName,
                  editingCategory.name,
                )
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSubcategory}
        onOpenChange={(open) => !open && setEditingSubcategory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit subcategory</DialogTitle>
            <DialogDescription>
              Rename this subcategory across the workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={editingSubcategory?.name || ""}
            onChange={(e) =>
              setEditingSubcategory({
                ...editingSubcategory,
                name: e.target.value,
              })
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              updateContentOption(
                "subcategory",
                editingSubcategory.oldName,
                editingSubcategory.name,
              )
            }
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSubcategory(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateContentOption(
                  "subcategory",
                  editingSubcategory.oldName,
                  editingSubcategory.name,
                )
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget ? "Delete " + deleteTarget.type + "?" : "Delete item?"
        }
        description={
          deleteTarget
            ? 'Delete "' +
              deleteTarget.name +
              '"? Existing blogs will lose this value.'
            : "This item will be removed."
        }
        onConfirm={() =>
          deleteTarget &&
          deleteContentOption(deleteTarget.type, deleteTarget.name)
        }
      />

      {tab === "general" && (
        <Card className="card-hover max-w-3xl">
          <CardContent className="p-5 space-y-4">
            <Labeled label="Site name" required>
              <Input
                value={form.general.siteName || ""}
                onChange={(e) => upG("siteName", e.target.value)}
              />
            </Labeled>
            <Labeled label="Tagline">
              <Input
                value={form.general.tagline || ""}
                onChange={(e) => upG("tagline", e.target.value)}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Timezone">
                <Select
                  value={form.general.timezone || options?.timezones?.[0] || ""}
                  onValueChange={(v) => upG("timezone", v)}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.timezones || []).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
              <Labeled label="Language">
                <Select
                  value={form.general.language || options?.languages?.[0] || ""}
                  onValueChange={(v) => upG("language", v)}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.languages || []).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
            </div>
            <Button
              onClick={() => save("General")}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save changes
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "seo" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-4 items-start">
          <div className="space-y-4">
            {/* Meta defaults */}
            <Card className="card-hover">
              <CardContent className="p-5 space-y-4">
                <Labeled
                  label="Default meta title template"
                  hint="use {title} placeholder"
                >
                  <Input
                    value={form.seo.defaultMetaTitle || ""}
                    onChange={(e) => upS("defaultMetaTitle", e.target.value)}
                    placeholder="{title} — SEO Studio"
                  />
                </Labeled>
                <Labeled label="Default meta description">
                  <Textarea
                    rows={2}
                    value={form.seo.defaultMetaDescription || ""}
                    onChange={(e) =>
                      upS("defaultMetaDescription", e.target.value)
                    }
                  />
                </Labeled>
                <Button
                  onClick={() => save("SEO")}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Save changes
                </Button>
              </CardContent>
            </Card>

            {/* Section 1: Robots.txt & AI Crawlers */}
            <Card className="card-hover">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-500" />
                    <p className="text-[14px] font-semibold">
                      Robots.txt &amp; AI Crawlers
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddBotOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add AI Bot
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {aiCrawlers.length === 0 && (
                    <p className="text-[12px] text-muted-foreground text-center py-3">
                      No AI crawlers configured. Click &ldquo;Add AI Bot&rdquo;
                      to add one.
                    </p>
                  )}
                  {aiCrawlers.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {c.userAgent}
                        </p>
                      </div>
                      <Badge
                        variant={c.allowed ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {c.allowed ? "Allow" : "Block"}
                      </Badge>
                      <Switch
                        checked={!!c.allowed}
                        onCheckedChange={() => toggleCrawler(c.id)}
                      />
                      <button type="button" onClick={() => deleteCrawler(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12.5px] font-medium">
                      robots.txt
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateRobotsTemplate}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Compile from rules
                    </Button>
                  </div>
                  <Textarea
                    rows={7}
                    value={form.seo.robotsTxt || ""}
                    onChange={(e) => upS("robotsTxt", e.target.value)}
                    className="font-mono text-[11.5px]"
                  />
                  <a
                    href={`${vinimayUrl}/robots.txt`}
                    target="_blank"
                    className="text-[11px] text-violet-500 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview live robots.txt
                  </a>
                </div>
                <Button
                  onClick={() => save("SEO")}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Save changes
                </Button>
              </CardContent>
            </Card>

            {/* Section 2: Sitemap / Search Indexing */}
            <Card className="card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-500" />
                  <p className="text-[14px] font-semibold">
                    Search Engine Indexing (Sitemap)
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium">XML Sitemap</p>
                      <p className="text-[11px] text-muted-foreground">
                        Include published blogs in sitemap.xml (filters out
                        noindex blogs automatically)
                      </p>
                    </div>
                    <Switch
                      checked={!!form.seo.sitemapEnabled}
                      onCheckedChange={(v) => upS("sitemapEnabled", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium">
                        Google Search Console verified
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {form.seo.gscProperty ||
                          "Connected via Google Service Account"}
                      </p>
                    </div>
                    <Switch
                      checked={!!form.seo.gscVerified}
                      onCheckedChange={(v) => upS("gscVerified", v)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={`${vinimayUrl}/sitemap.xml`}
                    target="_blank"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview live
                    sitemap.xml
                  </a>
                </div>
                <Button
                  onClick={() => save("SEO")}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Save changes
                </Button>
              </CardContent>
            </Card>

            {/* Section 3: LLMs.txt / GEO */}
            <Card className="card-hover">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-[14px] font-semibold">
                    Generative Engine Optimization (LLMs.txt)
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium">Enable llms.txt</p>
                    <p className="text-[11px] text-muted-foreground">
                      Serve AI-readable knowledge file for ChatGPT, Claude,
                      Perplexity, Gemini
                    </p>
                  </div>
                  <Switch
                    checked={!!(form.llm?.enabled !== false)}
                    onCheckedChange={(v) => upL("enabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium">
                      Auto-include published blogs
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Noindex blogs are automatically excluded from llms.txt
                    </p>
                  </div>
                  <Switch
                    checked={!!(form.llm?.includeBlogs !== false)}
                    onCheckedChange={(v) => upL("includeBlogs", v)}
                  />
                </div>
                <Labeled label="Site summary for AI (shown at top of llms.txt)">
                  <Textarea
                    rows={3}
                    value={form.llm?.summary || ""}
                    onChange={(e) => upL("summary", e.target.value)}
                    placeholder="Describe your business for AI models..."
                  />
                </Labeled>
                <a
                  href={`${vinimayUrl}/llms.txt`}
                  target="_blank"
                  className="text-[11px] text-amber-600 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Preview live llms.txt
                </a>
                <Button
                  onClick={() => save("LLMs")}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Save changes
                </Button>
              </CardContent>
            </Card>
          </div>
          {/* Taxonomy & Categories Card */}
          <Card className="card-hover overflow-hidden border border-border/80 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-border/70 bg-muted/20">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-foreground leading-none">
                      Content Taxonomy
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      Categories and subcategories for blogs
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs shadow-sm hover:opacity-95"
                  onClick={() =>
                    taxonomyTab === "categories"
                      ? setAddCategoryOpen(true)
                      : setAddSubcategoryOpen(true)
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add {taxonomyTab === "categories" ? "Category" : "Subcategory"}
                </Button>
              </div>

              {/* Segmented Switcher */}
              <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setTaxonomyTab("categories");
                    setTaxonomySearch("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    taxonomyTab === "categories"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 text-violet-500" />
                  <span>Categories</span>
                  <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-normal text-muted-foreground">
                    {contentOptions?.categories?.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaxonomyTab("subcategories");
                    setTaxonomySearch("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    taxonomyTab === "subcategories"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Subcategories</span>
                  <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-normal text-muted-foreground">
                    {contentOptions?.subcategories?.length || 0}
                  </span>
                </button>
              </div>

              {/* Search filter */}
              <div className="relative mt-2.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={taxonomySearch}
                  onChange={(e) => setTaxonomySearch(e.target.value)}
                  placeholder={`Search ${taxonomyTab}...`}
                  className="h-8 pl-8 text-xs bg-background/80"
                />
              </div>
            </div>

            <CardContent className="p-3 sm:p-4">
              <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                {taxonomyTab === "categories" ? (
                  categoriesList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      <Folder className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1.5" />
                      {taxonomySearch ? "No categories matching search" : "No categories yet."}
                    </div>
                  ) : (
                    categoriesList.map((category) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-violet-200 dark:hover:border-violet-900 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded-md bg-violet-100/80 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Folder className="h-3 w-3" />
                          </div>
                          <span className="text-[12.5px] font-medium text-foreground truncate">
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setEditingCategory({
                                oldName: category,
                                name: category,
                              })
                            }
                            title="Rename category"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() =>
                              setDeleteTarget({
                                type: "category",
                                name: category,
                              })
                            }
                            title="Delete category"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  subcategoriesList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1.5" />
                      {taxonomySearch ? "No subcategories matching search" : "No subcategories yet."}
                    </div>
                  ) : (
                    subcategoriesList.map((subcategory) => (
                      <div
                        key={subcategory}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded-md bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Tag className="h-3 w-3" />
                          </div>
                          <span className="text-[12.5px] font-medium text-foreground truncate">
                            {subcategory}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setEditingSubcategory({
                                oldName: subcategory,
                                name: subcategory,
                              })
                            }
                            title="Rename subcategory"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() =>
                              setDeleteTarget({
                                type: "subcategory",
                                name: subcategory,
                              })
                            }
                            title="Delete subcategory"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "publishing" && (
        <Card className="card-hover max-w-3xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">
                  Require editor approval
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Blogs must pass review before publishing
                </p>
              </div>
              <Switch
                checked={!!form.publishing.requireApproval}
                onCheckedChange={(v) => upP("requireApproval", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">
                  Auto-publish scheduled blogs
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Publish automatically at the scheduled time
                </p>
              </div>
              <Switch
                checked={!!form.publishing.autoPublishScheduled}
                onCheckedChange={(v) => upP("autoPublishScheduled", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">
                  Enforce publish checklist
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Block publishing when critical SEO fields are missing
                </p>
              </div>
              <Switch
                checked={!!form.publishing.checklistEnabled}
                onCheckedChange={(v) => upP("checklistEnabled", v)}
              />
            </div>
            <Labeled label="Default status for new blogs">
              <Select
                value={
                  form.publishing.defaultStatus ||
                  options?.defaultStatuses?.[0] ||
                  ""
                }
                onValueChange={(v) => upP("defaultStatus", v)}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(options?.defaultStatuses || []).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "draft" ? "Draft" : "In Review"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Labeled>
            <Button
              onClick={() => save("Publishing")}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save changes
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "profile" && (
        <Card className="card-hover max-w-3xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-lg">{user?.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {user?.email}
                </p>
                <Badge
                  variant="outline"
                  className="mt-1.5 text-[11px] bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900"
                >
                  {user?.role}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[13px] font-medium">Dark mode</p>
                  <p className="text-[11px] text-muted-foreground">
                    Currently using {theme === "dark" ? "dark" : "light"} theme
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              />
            </div>
            <p className="text-[12px] text-muted-foreground">
              Role permissions and access rights can be configured under
              Management &gt; Roles &amp; Permissions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
