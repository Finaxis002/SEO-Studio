"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  Trash2,
  Users,
  Mail,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Labeled } from "../bits";
import { api, fetcher, initials } from "@/lib/client";
import { EmptyState, ConfirmDialog } from "../bits";

export default function Team({ user, can }) {
  const { data: team, error, mutate } = useSWR("/api/team", fetcher);
  const { data: roles } = useSWR("/api/roles", fetcher);
  const { data: teamOptions } = useSWR("/api/team-options", fetcher);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [nk, setNk] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    password: "",
  });
  const [viewMember, setViewMember] = useState(null);
  const roleOptions = (Array.isArray(roles) ? roles : []).map(
    (role) => role.name,
  );
  const departmentOptions = teamOptions?.departments || [];

  useEffect(() => {
    if (!nk.role && roleOptions.length)
      setNk((value) => ({
        ...value,
        role: roleOptions.includes("Content Writer")
          ? "Content Writer"
          : roleOptions[0],
      }));
    if (!nk.department && departmentOptions.length)
      setNk((value) => ({ ...value, department: departmentOptions[0] }));
  }, [nk.role, nk.department, roleOptions, departmentOptions]);

  const items = (team || []).filter(
    (m) =>
      (!q ||
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.includes(q.toLowerCase())) &&
      (roleFilter === "all" || m.role === roleFilter),
  );

  const invite = () => {
    if (!nk.name.trim() || !nk.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nk.email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!nk.role || !nk.department) {
      toast.error("Role and department are required");
      return;
    }
    if (nk.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    api("/team", { method: "POST", body: nk })
      .then(() => {
        toast.success("User invited successfully");
        setInviteOpen(false);
        setNk({ name: "", email: "", role: "", department: "", password: "" });
        mutate();
      })
      .catch((e) => toast.error(e.message));
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {team
              ? team.length +
                " members · " +
                (team || []).filter((m) => m.status === "active").length +
                " active"
              : "Loading…"}
          </p>
        </div>
        {can("team.invite") && (
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-3.5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search team members…"
              className="pl-9 bg-muted/40"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[170px] h-9 bg-muted/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden card-hover">
        {error ? (
          <EmptyState title="Something went wrong" onRetry={() => mutate()} />
        ) : !team ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Try a different search or invite someone new."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  {[
                    "Member",
                    "Role",
                    "Department",
                    "Blogs",
                    "Last active",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={
                        "font-semibold px-3 py-3 " +
                        (i === 0 ? "text-left pl-4" : "text-left")
                      }
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors"
                  >
                    <td className="pl-4 pr-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback className="text-[11px] font-bold bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-[11.5px] text-muted-foreground">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal"
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-[13px]">
                      {m.department}
                    </td>
                    <td className="px-3 py-3 text-[13px] tabular-nums">
                      {m.blogsCreated}{" "}
                      <span className="text-muted-foreground">
                        / {m.blogsPublished} pub
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-muted-foreground">
                      {m.lastActive}
                    </td>
                    <td className="px-3 py-3">
                      {can("team.edit") ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={m.status === "active"}
                            onCheckedChange={(v) =>
                              api("/team/" + m.id, {
                                method: "PUT",
                                body: { status: v ? "active" : "inactive" },
                              }).then(() => {
                                toast.success(
                                  v ? "Member activated" : "Member deactivated",
                                );
                                mutate();
                              })
                            }
                          />
                          <span className="text-[11.5px] text-muted-foreground">
                            {m.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            "text-[11px] " +
                            (m.status === "active"
                              ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                              : "border-zinc-200 text-zinc-500")
                          }
                        >
                          {m.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewMember(m)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {can("team.edit") && (
                            <DropdownMenuItem
                              onClick={() =>
                                setEditMember({ ...m, password: "" })
                              }
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {can("team.edit") && (
                            <DropdownMenuItem
                              onClick={() =>
                                api("/team/" + m.id, {
                                  method: "PUT",
                                  body: {
                                    status:
                                      m.status === "active"
                                        ? "inactive"
                                        : "active",
                                  },
                                }).then(mutate)
                              }
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {can("team.delete") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600"
                                onClick={() => setConfirmDel(m)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invite */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              They will receive access based on the selected role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Labeled label="Full name" required>
              <Input
                value={nk.name}
                onChange={(e) => setNk({ ...nk, name: e.target.value })}
                placeholder="Jane Cooper"
              />
            </Labeled>
            <Labeled label="Email" required>
              <Input
                type="email"
                value={nk.email}
                onChange={(e) => setNk({ ...nk, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </Labeled>
            <Labeled label="Initial password" required>
              <Input
                type="password"
                autoComplete="new-password"
                value={nk.password}
                onChange={(e) => setNk({ ...nk, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Role" required>
                <Select
                  value={nk.role}
                  onValueChange={(v) => setNk({ ...nk, role: v })}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
              <Labeled label="Department">
                <Select
                  value={nk.department}
                  onValueChange={(v) => setNk({ ...nk, department: v })}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Permissions are inherited from the role and can be fine-tuned in
              Roles &amp; Permissions.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={!!editMember}
        onOpenChange={(o) => !o && setEditMember(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Update member details and permissions.
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="space-y-3 py-1">
              <Labeled label="Full name" required>
                <Input
                  value={editMember.name}
                  onChange={(e) =>
                    setEditMember({ ...editMember, name: e.target.value })
                  }
                />
              </Labeled>
              <Labeled label="Email" required>
                <Input
                  value={editMember.email}
                  onChange={(e) =>
                    setEditMember({ ...editMember, email: e.target.value })
                  }
                />
              </Labeled>
              <Labeled label="New password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={editMember.password || ""}
                  onChange={(e) =>
                    setEditMember({ ...editMember, password: e.target.value })
                  }
                  placeholder="Leave blank to keep current password"
                />
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Role">
                  <Select
                    value={editMember.role}
                    onValueChange={(v) =>
                      setEditMember({ ...editMember, role: v })
                    }
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
                <Labeled label="Department">
                  <Select
                    value={editMember.department}
                    onValueChange={(v) =>
                      setEditMember({ ...editMember, department: v })
                    }
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                api("/team/" + editMember.id, {
                  method: "PUT",
                  body: editMember,
                })
                  .then(() => {
                    toast.success("Member updated");
                    setEditMember(null);
                    mutate();
                  })
                  .catch((e) => toast.error(e.message))
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View drawer-lite */}
      <Dialog
        open={!!viewMember}
        onOpenChange={(o) => !o && setViewMember(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Member details</DialogTitle>
            <DialogDescription className="sr-only">
              View member profile and role details
            </DialogDescription>
          </DialogHeader>
          {viewMember && (
            <div className="space-y-2.5 text-[13px] py-1">
              <div className="flex items-center gap-3 pb-2">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="font-bold bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                    {initials(viewMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{viewMember.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {viewMember.role} · {viewMember.department}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {viewMember.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Joined {viewMember.joinedAt}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  ["Created", viewMember.blogsCreated],
                  ["Published", viewMember.blogsPublished],
                  ["Status", viewMember.status],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="rounded-lg border border-border p-2.5 text-center"
                  >
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {l}
                    </p>
                    <p className="font-bold text-sm capitalize">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Remove this member?"
        description={
          confirmDel?.name + " will lose access to the workspace immediately."
        }
        onConfirm={() => {
          api("/team/" + confirmDel.id, { method: "DELETE" }).then(() => {
            toast.success("Member removed");
            mutate();
          });
          setConfirmDel(null);
        }}
      />
    </div>
  );
}
