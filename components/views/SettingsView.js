"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Pencil, Save, Sun, Trash2 } from "lucide-react";
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
    canManageSettings ? null : { general: {}, seo: {}, publishing: {} },
  );
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [subcategoryCategory, setSubcategoryCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubcategoryOpen, setAddSubcategoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTab(canManageSettings ? initialTab || "general" : "profile");
  }, [initialTab, canManageSettings]);
  useEffect(() => {
    if (s && !form && canManageSettings)
      setForm({
        general: s.general || {},
        seo: s.seo || {},
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
              </div>
              <Button
                variant="outline"
                onClick={() => setAddCategoryOpen(true)}
              >
                Add category
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {(contentOptions?.categories || []).map((category) => (
                  <div
                    key={category}
                    className="flex items-center gap-1 rounded-md border px-2 py-1"
                  >
                    <Badge variant="outline" className="border-0 px-0">
                      {category}
                    </Badge>
                    <button
                      type="button"
                      title="Edit category"
                      onClick={() =>
                        setEditingCategory({
                          oldName: category,
                          name: category,
                        })
                      }
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      title="Delete category"
                      onClick={() =>
                        setDeleteTarget({ type: "category", name: category })
                      }
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAddSubcategoryOpen(true)}
              >
                Add subcategory
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {(contentOptions?.subcategories || []).map((subcategory) => (
                  <div
                    key={subcategory}
                    className="flex items-center gap-1 rounded-md border px-2 py-1"
                  >
                    <Badge variant="outline" className="border-0 px-0">
                      {subcategory}
                    </Badge>
                    <button
                      type="button"
                      title="Edit subcategory"
                      onClick={() =>
                        setEditingSubcategory({
                          oldName: subcategory,
                          name: subcategory,
                        })
                      }
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      title="Delete subcategory"
                      onClick={() =>
                        setDeleteTarget({
                          type: "subcategory",
                          name: subcategory,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
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
