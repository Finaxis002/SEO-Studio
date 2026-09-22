"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Search,
  Upload,
  FolderPlus,
  Image as ImageIcon,
  Copy,
  Download,
  Trash2,
  Replace,
  Eye,
  Folder,
  FileText,
  Film,
  Loader2,
  X,
  Sparkles,
  HardDrive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Labeled } from "../bits";
import { api, fetcher, fmtDate, fmtNum } from "@/lib/client";
import { EmptyState, ConfirmDialog } from "../bits";

export default function Media({ navigate, can, initialUpload }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [folder, setFolder] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);

  const {
    data: media,
    error,
    mutate,
  } = useSWR(
    "/api/media?q=" +
      encodeURIComponent(q) +
      "&type=" +
      type +
      (folder ? "&folder=" + encodeURIComponent(folder) : ""),
    fetcher,
  );
  const { data: allMedia } = useSWR("/api/media", fetcher);
  const [extraFolders, setExtraFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ss_folders") || "[]");
    } catch (e) {
      return [];
    }
  });

  const folders = useMemo(() => {
    const map = {};
    (allMedia || []).forEach((m) => {
      map[m.folder] = (map[m.folder] || 0) + 1;
    });
    extraFolders.forEach((f) => {
      if (!map[f]) map[f] = 0;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [allMedia, extraFolders]);

  // Open upload dialog automatically when arriving via "Upload Images" nav
  useEffect(() => {
    if (initialUpload && fileRef.current) {
      fileRef.current.click();
    }
  }, [initialUpload]);

  async function doUpload(files) {
    if (!can("media.upload")) {
      toast.error("Your role cannot upload media.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          const dims = await new Promise((res) => {
            const i = new Image();
            i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
            i.onerror = () => res({ w: 0, h: 0 });
            i.src = URL.createObjectURL(f);
          });
          fd.append("width", dims.w);
          fd.append("height", dims.h);
        }
        fd.append("files", f);
      }
      fd.append("folder", folder || "Blog Images");
      const created = await api("/upload", {
        method: "POST",
        body: fd,
        raw: true,
      });
      toast.success(
        created.length +
          " file" +
          (created.length > 1 ? "s" : "") +
          " uploaded successfully",
      );
      mutate();
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function replaceFile(file) {
    if (!selected) return;
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("folder", selected.folder);
      fd.append("alt", selected.alt || "");
      fd.append("title", selected.name);
      const created = await api("/upload", {
        method: "POST",
        body: fd,
        raw: true,
      });
      await api("/media/" + selected.id, {
        method: "PUT",
        body: {
          url: created[0].url,
          publicId: created[0].publicId,
          storage: created[0].storage,
          size: created[0].size,
          dimensions: created[0].dimensions,
          format: created[0].format,
          compressed: created[0].compressed,
        },
      });
      toast.success("Image replaced");
      mutate();
      setSelected(null);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function convertToWebP(m) {
    if (!m?.url) {
      toast.error("Invalid media item");
      return;
    }
    const toastId = toast.loading("Converting to WebP...");
    try {
      const res = await api("/media/optimize", {
        method: "POST",
        body: {
          url: m.url,
          mode: "webp",
          filename: m.name,
          alt: m.alt || m.name,
          folder: m.folder || "Blog Images",
        },
      });
      if (res && res.url) {
        await api("/media/" + m.id, {
          method: "PUT",
          body: {
            url: res.url,
            publicId: res.publicId,
            storage: res.storage || "cloudinary",
            size: res.size,
            format: "WEBP",
            compressed: true,
          },
        });
        toast.success(`Converted to WebP — ${Math.round(res.size / 1024)} KB`, {
          id: toastId,
        });
        mutate();
        if (selected?.id === m.id)
          setSelected({
            ...m,
            url: res.url,
            size: res.size,
            format: "WEBP",
            compressed: true,
          });
      } else {
        throw new Error(res?.error || "Conversion failed");
      }
    } catch (e) {
      toast.error(e.message || "Conversion failed", { id: toastId });
    }
  }

  const typeIcon = (t) =>
    t === "video" ? Film : t === "document" ? FileText : ImageIcon;

  return (
    <div className="space-y-4 animate-fade-up">
      <div
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          doUpload(Array.from(e.dataTransfer.files || []));
        }}
      >
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            Media Library
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dragOver ? (
              <span className="text-violet-600 font-medium">
                Drop files to upload…
              </span>
            ) : media ? (
              media.length + " files · " + folders.length + " folders"
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("media.upload") && (
            <Button variant="outline" onClick={() => setFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-1.5" />
              Create Folder
            </Button>
          )}
          {can("media.upload") && (
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              Upload Media
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx"
        hidden
        onChange={(e) => {
          doUpload(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) replaceFile(f);
          e.target.value = "";
        }}
      />

      {/* Folders */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFolder(null)}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors " +
            (!folder
              ? "border-transparent bg-primary text-primary-foreground shadow-sm"
              : "border-border hover:bg-accent text-muted-foreground")
          }
        >
          <Folder className="h-3.5 w-3.5" /> All files
        </button>
        {folders.map((f) => (
          <button
            key={f.name}
            onClick={() => setFolder(f.name)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors " +
              (folder === f.name
                ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                : "border-border hover:bg-accent text-muted-foreground")
            }
          >
            <Folder className="h-3.5 w-3.5" /> {f.name}{" "}
            <span className="opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3.5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search media…"
              className="pl-9 bg-muted/40"
            />
          </div>
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">
                All
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs px-3">
                Images
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs px-3">
                Videos
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs px-3">
                Documents
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Grid */}
      {error ? (
        <Card>
          <CardContent>
            <EmptyState
              title="Something went wrong"
              description="Unable to load media."
              onRetry={() => mutate()}
            />
          </CardContent>
        </Card>
      ) : !media ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ImageIcon}
              title="No media found"
              description="Upload images to use them across your blogs, or adjust your search and filters."
              action={
                can("media.upload") ? (
                  <Button onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload Media
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((m) => {
            const Icon = typeIcon(m.type);
            return (
              <Card
                key={m.id}
                className="card-hover overflow-hidden group cursor-pointer"
                onClick={() => setSelected(m)}
              >
                <div className="relative h-40 bg-muted">
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={m.alt || m.name}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Icon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => setSelected(m)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      title="Copy URL"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          m.url.startsWith("http")
                            ? m.url
                            : window.location.origin + m.url,
                        );
                        toast.success("URL copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      title="Download"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = m.url;
                        a.download = m.name;
                        a.target = "_blank";
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {can("media.delete") && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 text-rose-600"
                        title="Delete"
                        onClick={() => setConfirmDel(m)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-[12.5px] font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {m.dimensions?.width
                      ? m.dimensions.width + "×" + m.dimensions.height + " · "
                      : ""}
                    {fmtNum(Math.round(m.size / 1024))} KB · {m.format || "—"}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {m.folder}
                    </Badge>
                    {(m.usedIn || []).length > 0 && (
                      <span className="text-[10.5px] text-muted-foreground">
                        Used in {m.usedIn.length} blog
                        {m.usedIn.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] p-0 overflow-y-auto sm:max-w-[480px]"
        >
          {selected && (
            <MediaDrawer
              media={selected}
              onClose={() => setSelected(null)}
              navigate={navigate}
              onReplace={() => replaceRef.current?.click()}
              onConvert={() => convertToWebP(selected)}
              can={can}
              onSave={async (patch) => {
                await api("/media/" + selected.id, {
                  method: "PUT",
                  body: patch,
                });
                toast.success("Media updated");
                mutate();
                setSelected({ ...selected, ...patch });
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* New folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              Organize assets by campaign or usage.
            </DialogDescription>
          </DialogHeader>
          <Labeled label="Folder name" required>
            <Input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="e.g. Q3 Campaigns"
            />
          </Labeled>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newFolder.trim()) return;
                const f = [...extraFolders, newFolder.trim()];
                setExtraFolders(f);
                localStorage.setItem("ss_folders", JSON.stringify(f));
                setNewFolder("");
                setFolderOpen(false);
                toast.success("Folder created");
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete this media?"
        description={
          "“" +
          (confirmDel?.name || "") +
          "” will be removed from the library and any blogs using it will lose the image."
        }
        onConfirm={() => {
          api("/media/" + confirmDel.id, { method: "DELETE" }).then(() => {
            toast.success("Media deleted");
            mutate();
            setSelected(null);
          });
          setConfirmDel(null);
        }}
      />
    </div>
  );
}

function MediaDrawer({
  media: m,
  onClose,
  onReplace,
  onConvert,
  onSave,
  navigate,
  can,
}) {
  const [alt, setAlt] = useState(m.alt || "");
  const [title, setTitle] = useState(m.title || "");
  const [caption, setCaption] = useState(m.caption || "");
  const [desc, setDesc] = useState(m.description || "");

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <h3 className="font-semibold truncate">{m.name}</h3>
          <p className="text-[11.5px] text-muted-foreground">
            Uploaded {fmtDate(m.uploadedAt)} by {m.uploadedBy}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-muted/40">
        <img
          src={m.url}
          alt={m.alt || m.name}
          className="w-full h-60 object-contain"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        {[
          [HardDrive, Math.round(m.size / 1024) + " KB"],
          [
            ImageIcon,
            (m.dimensions?.width || 0) + "×" + (m.dimensions?.height || 0),
          ],
          [FileText, m.format || "—"],
          [Folder, m.folder],
        ].map(([Icon, v], i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{v}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <span className="text-[11px] text-muted-foreground flex-1 truncate">
          {m.url}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => {
            navigator.clipboard.writeText(
              m.url.startsWith("http") ? m.url : window.location.origin + m.url,
            );
            toast.success("URL copied");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        <Labeled label="Alt text" required>
          <Input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe this image…"
          />
        </Labeled>
        <Labeled label="Image title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Labeled>
        <Labeled label="Caption">
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Labeled>
        <Labeled label="Description">
          <Textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Labeled>
        <Button
          className="w-full"
          onClick={() => onSave({ alt, title, caption, description: desc })}
        >
          Save changes
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {can("media.upload") && (
          <Button size="sm" variant="outline" onClick={onReplace}>
            <Replace className="h-3.5 w-3.5 mr-1" />
            Replace
          </Button>
        )}
        {can("media.edit") &&
          m.format !== "WEBP" &&
          !m.name?.endsWith(".webp") &&
          !m.url?.endsWith(".webp") && (
            <Button size="sm" variant="outline" onClick={onConvert}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Convert to WebP
            </Button>
          )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const a = document.createElement("a");
            a.href = m.url;
            a.download = m.name;
            a.target = "_blank";
            a.click();
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Download
        </Button>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Used in
        </p>
        {(m.usedIn || []).length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            Not used in any blog yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {m.usedIn.map((u, i) => (
              <button
                key={i}
                onClick={() => navigate("blog", { id: u.blogId })}
                className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left hover:bg-accent transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-[12.5px] truncate flex-1">{u.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
