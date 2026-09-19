"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ShieldCheck, Plus, Save, Trash2, Info, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Labeled } from "../bits";
import { api, fetcher, initials } from "@/lib/client";
import { EmptyState, ConfirmDialog } from "../bits";

const CATALOG = [
  {
    group: "Content",
    items: [
      {
        key: "blogs.view",
        label: "View Blogs",
        desc: "See all blog posts in the dashboard and lists.",
      },
      {
        key: "blogs.create",
        label: "Create Blogs",
        desc: "Start new drafts in the blog editor.",
      },
      {
        key: "blogs.edit",
        label: "Edit Blogs",
        desc: "Modify content, metadata and media of blogs.",
      },
      {
        key: "blogs.delete",
        label: "Delete Blogs",
        desc: "Permanently remove blogs from the system.",
      },
      {
        key: "blogs.publish",
        label: "Publish Blogs",
        desc: "Approve and make blogs live on the website.",
      },
      {
        key: "blogs.schedule",
        label: "Schedule Blogs",
        desc: "Queue blogs to publish at a future date and time.",
      },
      {
        key: "blogs.archive",
        label: "Archive Blogs",
        desc: "Move outdated blogs out of the active workflow.",
      },
    ],
  },
  {
    group: "SEO",
    items: [
      {
        key: "seo.view",
        label: "View SEO Data",
        desc: "See SEO scores, checklists and metadata.",
      },
      {
        key: "seo.edit",
        label: "Edit SEO Metadata",
        desc: "Change titles, descriptions, canonicals and robots.",
      },
      {
        key: "seo.keywords",
        label: "Manage Keywords",
        desc: "Add, import and organize tracked keywords.",
      },
      {
        key: "seo.issues.view",
        label: "View SEO Issues",
        desc: "See the site-wide SEO issues dashboard.",
      },
      {
        key: "seo.issues.resolve",
        label: "Resolve SEO Issues",
        desc: "Fix SEO issues across blogs and media.",
      },
    ],
  },
  {
    group: "Media",
    items: [
      {
        key: "media.view",
        label: "View Media",
        desc: "Browse the media library and image details.",
      },
      {
        key: "media.upload",
        label: "Upload Media",
        desc: "Add new images and files to the library.",
      },
      {
        key: "media.edit",
        label: "Edit Media",
        desc: "Update alt text, captions and organize folders.",
      },
      {
        key: "media.delete",
        label: "Delete Media",
        desc: "Remove files from the library.",
      },
    ],
  },
  {
    group: "Analytics",
    items: [
      {
        key: "analytics.view",
        label: "View Analytics",
        desc: "Access traffic and performance dashboards.",
      },
      {
        key: "analytics.export",
        label: "Export Analytics",
        desc: "Download reports as CSV.",
      },
    ],
  },
  {
    group: "Team",
    items: [
      {
        key: "team.view",
        label: "View Team",
        desc: "See team members and their activity.",
      },
      {
        key: "team.invite",
        label: "Invite Users",
        desc: "Send invitations to new team members.",
      },
      {
        key: "team.edit",
        label: "Edit Users",
        desc: "Change member roles, departments and status.",
      },
      {
        key: "team.delete",
        label: "Delete Users",
        desc: "Remove members from the workspace.",
      },
      {
        key: "team.roles",
        label: "Manage Roles",
        desc: "Create roles and change permission matrices.",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "settings.view",
        label: "View Settings",
        desc: "Open workspace settings pages.",
      },
      {
        key: "settings.edit",
        label: "Edit Settings",
        desc: "Change general, SEO and publishing settings.",
      },
    ],
  },
];

export default function Roles({ can }) {
  const { data: roles, error, mutate } = useSWR("/api/roles", fetcher);
  const { data: permissionCatalog } = useSWR("/api/permissions", fetcher);
  const catalog = permissionCatalog || CATALOG;
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [nr, setNr] = useState({ name: "", description: "", permissions: [] });
  const [confirmDel, setConfirmDel] = useState(null);

  const selected =
    (roles || []).find((r) => r.id === selectedId) || (roles || [])[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected]); // eslint-disable-line

  useEffect(() => {
    if (selected) setDraft(selected.permissions || []);
  }, [selected?.id]); // eslint-disable-line

  const toggle = (key) =>
    setDraft((d) =>
      d.includes(key) ? d.filter((x) => x !== key) : [...d, key],
    );
  const canManage = can("team.roles");

  const save = () => {
    if (!canManage) {
      toast.error("Your role cannot manage roles.");
      return;
    }
    api("/roles/" + selected.id, {
      method: "PUT",
      body: { permissions: draft },
    })
      .then(() => {
        toast.success("Permissions updated for " + selected.name);
        mutate();
      })
      .catch((e) => toast.error(e.message));
  };

  if (error)
    return <EmptyState title="Something went wrong" onRetry={() => mutate()} />;

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control exactly what each role can see and do.
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Custom Role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Role list */}
        <div className="space-y-2">
          {!roles
            ? Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))
            : roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={
                    "w-full text-left rounded-xl border p-3.5 transition-all " +
                    (selected?.id === r.id
                      ? "border-primary/60 bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-accent/50")
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center text-[11px] font-bold">
                      {r.isCustom ? (
                        initials(r.name)
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold truncate">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(r.permissions || []).length} permissions
                      </p>
                    </div>
                    {r.isCustom && (
                      <Badge variant="outline" className="text-[10px]">
                        Custom
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
        </div>

        {/* Matrix */}
        <Card className="overflow-hidden">
          {selected && (
            <>
              <div className="border-b border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold">{selected.name}</h2>
                    {selected.isCustom && (
                      <Badge variant="outline" className="text-[10px]">
                        Custom role
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5">
                    {selected.description}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    onClick={save}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save changes
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Lock className="h-3 w-3" />
                    Read-only for your role
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 space-y-5">
                {catalog.map((g) => (
                  <div key={g.group}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {g.group}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {g.items.map((p) => (
                        <TooltipProvider key={p.key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={
                                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors " +
                                  (draft.includes(p.key)
                                    ? "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30"
                                    : "border-border")
                                }
                              >
                                <div className="min-w-0">
                                  <p className="text-[13px] font-medium truncate">
                                    {p.label}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {p.desc}
                                  </p>
                                </div>
                                <Switch
                                  disabled={!canManage}
                                  checked={draft.includes(p.key)}
                                  onCheckedChange={() => toggle(p.key)}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="text-xs max-w-[240px]"
                            >
                              {p.desc}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create role */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create custom role</DialogTitle>
            <DialogDescription>
              Example: “Junior SEO Executive” with limited publishing rights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Labeled label="Role name" required>
              <Input
                value={nr.name}
                onChange={(e) => setNr({ ...nr, name: e.target.value })}
                placeholder="Junior SEO Executive"
              />
            </Labeled>
            <Labeled label="Description">
              <Input
                value={nr.description}
                onChange={(e) => setNr({ ...nr, description: e.target.value })}
                placeholder="What does this role do?"
              />
            </Labeled>
            <div>
              <p className="text-[12px] font-semibold mb-2">Permissions</p>
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {catalog
                  .flatMap((g) => g.items)
                  .map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-1.5 cursor-pointer hover:bg-accent/50 text-[12.5px]"
                    >
                      <input
                        type="checkbox"
                        checked={nr.permissions.includes(p.key)}
                        onChange={() => toggle2(nr, setNr, p.key)}
                        className="accent-violet-600"
                      />
                      {p.label}
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!nr.name.trim()) {
                  toast.error("Role name is required");
                  return;
                }
                api("/roles", { method: "POST", body: nr })
                  .then(() => {
                    toast.success("Custom role created");
                    setCreateOpen(false);
                    setNr({ name: "", description: "", permissions: [] });
                    mutate();
                  })
                  .catch((e) => toast.error(e.message));
              }}
            >
              Create role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete custom role?"
        description="Members with this role will fall back to Viewer permissions."
        onConfirm={() => {
          api("/roles/" + confirmDel.id, { method: "DELETE" })
            .then(() => {
              toast.success("Role deleted");
              mutate();
            })
            .catch((e) => toast.error(e.message));
          setConfirmDel(null);
        }}
      />
    </div>
  );
}

function toggle2(nr, setNr, key) {
  setNr((n) => ({
    ...n,
    permissions: n.permissions.includes(key)
      ? n.permissions.filter((x) => x !== key)
      : [...n.permissions, key],
  }));
}
