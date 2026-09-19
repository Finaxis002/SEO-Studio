"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Save, Sun } from "lucide-react";
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
  const [form, setForm] = useState(null);
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

  return (
    <div className="space-y-4 animate-fade-up max-w-3xl">
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
        <Card className="card-hover">
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
      )}

      {tab === "publishing" && (
        <Card className="card-hover">
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
        <Card className="card-hover">
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
