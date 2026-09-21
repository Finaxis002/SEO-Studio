"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Check, Pencil, Save, Sun, Trash2, X } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Labeled } from "../bits";
import { api, fetcher, initials } from "@/lib/client";
import { useTheme } from "next-themes";

export default function SettingsView({ tab: initialTab, user }) {
  const [tab, setTab] = useState(initialTab || "general");
  const { data: s, mutate } = useSWR("/api/settings", fetcher);
  const { data: options } = useSWR("/api/settings-options", fetcher);
  const { data: contentOptions, mutate: mutateContentOptions } = useSWR(
    "/api/content-options",
    fetcher,
  );
  const [form, setForm] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [subcategoryCategory, setSubcategoryCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTab(initialTab || "general");
  }, [initialTab]);
  useEffect(() => {
    if (s && !form)
      setForm({
        general: s.general || {},
        seo: s.seo || {},
        publishing: s.publishing || {},
      });
  }, [s]); // eslint-disable-line

  if (!form)
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
  const upP = (k, v) =>
    setForm({ ...form, publishing: { ...form.publishing, [k]: v } });

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api("/categories", {
        method: "POST",
        body: { name: newCategory },
      });
      setNewCategory("");
      mutateContentOptions();
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
      mutateContentOptions();
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
      toast.success(type === "category" ? "Category updated" : "Subcategory updated");
      if (type === "category") setEditingCategory(null);
      else setEditingSubcategory(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteContentOption = async (type, name) => {
    if (!window.confirm("Delete " + name + "? Existing blogs will lose this value.")) return;
    try {
      await api("/" + (type === "category" ? "categories" : "subcategories"), {
        method: "DELETE",
        body: { name },
      });
      mutateContentOptions();
      toast.success(type === "category" ? "Category deleted" : "Subcategory deleted");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up max-w-6xl">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Workspace configuration and your profile.
        </p>
      </div>

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
                onChange={(e) => upS("defaultMetaDescription", e.target.value)}
              />
            </Labeled>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-[13px] font-medium">XML sitemap</p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically include blogs in sitemap.xml
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
            <Labeled label="robots.txt">
              <Textarea
                rows={4}
                value={form.seo.robotsTxt || ""}
                onChange={(e) => upS("robotsTxt", e.target.value)}
                className="font-mono text-[12.5px]"
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
        <Card className="card-hover">
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-[13px] font-medium">Content categories</p>
              <p className="text-[11px] text-muted-foreground">
                These values are stored in the database and appear in the Blog Editor.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button variant="outline" onClick={addCategory}>
                Add category
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(contentOptions?.categories || []).map((category) => (
                <div key={category} className="flex items-center gap-1 rounded-md border px-2 py-1">
                  {editingCategory?.oldName === category ? (
                    <Input
                      autoFocus
                      className="h-6 w-36 text-xs"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateContentOption("category", category, editingCategory.name);
                        if (e.key === "Escape") setEditingCategory(null);
                      }}
                    />
                  ) : (
                    <Badge variant="outline" className="border-0 px-0">{category}</Badge>
                  )}
                  {editingCategory?.oldName === category ? (
                    <>
                      <button type="button" title="Save category" onClick={() => updateContentOption("category", category, editingCategory.name)}><Check className="h-3.5 w-3.5 text-emerald-600" /></button>
                      <button type="button" title="Cancel" onClick={() => setEditingCategory(null)}><X className="h-3.5 w-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" title="Edit category" onClick={() => setEditingCategory({ oldName: category, name: category })}><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                      <button type="button" title="Delete category" onClick={() => deleteContentOption("category", category)}><Trash2 className="h-3 w-3 text-rose-600" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Input
                value={newSubcategory}
                onChange={(e) => setNewSubcategory(e.target.value)}
                placeholder="New subcategory"
                onKeyDown={(e) => e.key === "Enter" && addSubcategory()}
              />
              <Select value={subcategoryCategory} onValueChange={setSubcategoryCategory}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(contentOptions?.categories || []).map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full" onClick={addSubcategory}>
                Add subcategory
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(contentOptions?.subcategories || []).map((subcategory) => (
                <div key={subcategory} className="flex items-center gap-1 rounded-md border px-2 py-1">
                  {editingSubcategory?.oldName === subcategory ? (
                    <Input
                      autoFocus
                      className="h-6 w-36 text-xs"
                      value={editingSubcategory.name}
                      onChange={(e) => setEditingSubcategory({ ...editingSubcategory, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateContentOption("subcategory", subcategory, editingSubcategory.name);
                        if (e.key === "Escape") setEditingSubcategory(null);
                      }}
                    />
                  ) : (
                    <Badge variant="outline" className="border-0 px-0">{subcategory}</Badge>
                  )}
                  {editingSubcategory?.oldName === subcategory ? (
                    <>
                      <button type="button" title="Save subcategory" onClick={() => updateContentOption("subcategory", subcategory, editingSubcategory.name)}><Check className="h-3.5 w-3.5 text-emerald-600" /></button>
                      <button type="button" title="Cancel" onClick={() => setEditingSubcategory(null)}><X className="h-3.5 w-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" title="Edit subcategory" onClick={() => setEditingSubcategory({ oldName: subcategory, name: subcategory })}><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                      <button type="button" title="Delete subcategory" onClick={() => deleteContentOption("subcategory", subcategory)}><Trash2 className="h-3 w-3 text-rose-600" /></button>
                    </>
                  )}
                </div>
              ))}
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
