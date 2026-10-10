"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  ArrowUpDown,
  BookOpen,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";


import IconPicker from "@/components/ui/IconifyPicker";

import CategoryIcon from "./CategoryIcon";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, fetcher } from "@/lib/client";
import { Pagination } from "../bits";


export default function KbCategoriesView({ navigate }) {
  const { data, error, mutate, isLoading } = useSWR("/api/kb/categories", fetcher);
  const categories = data?.categories || [];

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const total = categories.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const paginatedCategories = useMemo(
    () => categories.slice((page - 1) * limit, page * limit),
    [categories, page, limit]
  );

  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages);
    }
  }, [pages, page]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    icon: "📄",
    description: "",
    order: 1,
    isActive: true,
  });

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm({
      name: "",
      icon: "📄",
      description: "",
      order: categories.length + 1,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || "",
      icon: cat.icon || "📄",
      description: cat.description || "",
      order: typeof cat.order === "number" ? cat.order : 1,
      isActive: cat.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/kb/categories/${editingCategory.id}`, form);
        toast.success(`Category "${form.name}" updated successfully!`);
      } else {
        await api.post("/kb/categories", form);
        toast.success(`Category "${form.name}" created successfully!`);
      }
      mutate();
      setDialogOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/kb/categories/${categoryToDelete.id}`);
      toast.success(`Category "${categoryToDelete.name}" deleted.`);
      mutate();
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      toast.error(err.message || "Cannot delete category");
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveOrder = async (cat, delta) => {
    // Sort categories list by current order
    const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sorted.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetCat = sorted[targetIndex];
    // Clean, distinct 1-based order numbers
    const newCatOrder = targetIndex + 1;
    const newTargetOrder = currentIndex + 1;

    try {
      await Promise.all([
        api.put(`/kb/categories/${cat.id}`, { order: newCatOrder }),
        api.put(`/kb/categories/${targetCat.id}`, { order: newTargetOrder }),
      ]);
      toast.success(`Moved "${cat.name}" to position #${newCatOrder}`);
      mutate();
    } catch (err) {
      toast.error(err.message || "Failed to update order");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Knowledge Base Categories</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {categories.length} Categories
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Organize customer tutorials and guides by product module. Reorder, edit, or add new categories anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("kb")}>
            <BookOpen className="w-4 h-4 mr-2" />
            All Guides
          </Button>
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Grid / Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Categories</CardTitle>
          <CardDescription>
            These categories are displayed on the Vinimay Help Center hub page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No categories found. Click "Add Category" to create one.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-2xl p-2 rounded-xl bg-accent/40 shrink-0 w-11 h-11 flex items-center justify-center">
               <CategoryIcon icon={cat.icon} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{cat.name}</span>
                        <div
                          className="flex items-center gap-1 shrink-0 bg-muted/50 rounded-md px-1.5 py-0.5 border border-border"
                          title={`Category order #${cat.order ?? 1} of ${categories.length}`}
                        >
                          <span className="text-[11px] font-mono text-muted-foreground font-medium">
                            #{cat.order ?? 1}{" "}
                            <span className="text-[10px] text-muted-foreground/70 font-normal">
                              of {categories.length}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={(cat.order ?? 1) <= 1}
                            onClick={() => handleMoveOrder(cat, -1)}
                            className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
                            title="Move Category Up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={(cat.order ?? 1) >= categories.length}
                            onClick={() => handleMoveOrder(cat, 1)}
                            className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
                            title="Move Category Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        {cat.articleCount > 0 ? (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            {cat.articleCount} {cat.articleCount === 1 ? "Guide" : "Guides"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            0 Guides
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                        {cat.description || "No description set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(cat)}
                      className="h-8 text-xs hover:bg-accent"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCategoryToDelete(cat);
                        setDeleteConfirmOpen(true);
                      }}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {categories.length > 0 && (
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
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="categories"
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                         Category Name *
  </label>

  <Input
    placeholder="e.g. Billing & Invoicing"
    value={form.name}
    onChange={(e) =>
      setForm((previous) => ({
        ...previous,
        name: e.target.value,
      }))
    }
    required
  />
</div>
         
      <div>
  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
    Category Icon / Emoji
  </label>

  <IconPicker
    value={form.icon}
    onChange={(icon) =>
      setForm((previous) => ({
        ...previous,
        icon,
      }))
    }
  />

  <p className="text-xs text-muted-foreground mt-2">
    Search and select an icon or emoji.
  </p>
</div>


            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Short Description
              </label>
              <Input
                placeholder="Brief summary of what this category covers..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Display Order
              </label>
              <Input
                type="number"
                min={1}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Category?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Are you sure you want to delete <strong>"{categoryToDelete?.name}"</strong>?
            {categoryToDelete?.articleCount > 0 && (
              <span className="block mt-2 font-medium text-destructive">
                ⚠️ Warning: This category has {categoryToDelete.articleCount} active guide(s). The system will prevent deletion unless you move or delete them first.
              </span>
            )}
          </p>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
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
