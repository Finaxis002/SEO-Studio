"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Search,
  Home,
  FileText,
  Plus,
  Images,
  Menu,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fetcher } from "@/lib/client";
import Sidebar, { navTitle } from "@/components/Sidebar";
import Header from "@/components/Header";
import Dashboard from "@/components/views/Dashboard";
import Blogs from "@/components/views/Blogs";
import BlogEditor from "@/components/views/BlogEditor";
import BlogDetail from "@/components/views/BlogDetail";
import Media from "@/components/views/Media";
import Keywords from "@/components/views/Keywords";
import Team from "@/components/views/Team";
import Roles from "@/components/views/Roles";
import ActivityView from "@/components/views/ActivityView";
import {
  SeoOverview,
  SeoIssues,
  ContentOptimization,
} from "@/components/views/SeoViews";
import AnalyticsView from "@/components/views/AnalyticsView";
import ScheduleView from "@/components/views/ScheduleView";
import SettingsView from "@/components/views/SettingsView";
import LoginForm from "@/components/LoginForm";
import { useTheme } from "next-themes";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function App() {
  const [view, setView] = useState({ name: "dashboard", params: {} });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  const { data: roles } = useSWR(user ? "/api/roles" : null, fetcher);
  const { data: notifications, mutate: notifMutate } = useSWR(
    user ? "/api/notifications" : null,
    fetcher,
  );
  const { data: stats, mutate: statsMutate } = useSWR(
    user ? "/api/stats" : null,
    fetcher,
  );
  const { data: issuesData, mutate: issuesMutate } = useSWR(
    user ? "/api/seo-issues" : null,
    fetcher,
  );

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
    setCollapsed(localStorage.getItem("ss_collapsed") === "1");
  }, []);

  // Global refresh
  useEffect(() => {
    const h = () => {
      statsMutate();
      issuesMutate();
      notifMutate();
    };
    window.addEventListener("ss-refresh", h);
    return () => window.removeEventListener("ss-refresh", h);
  }, [statsMutate, issuesMutate, notifMutate]);

  const navigate = useCallback((name, params) => {
    setView({ name, params: params || {} });
    window.scrollTo(0, 0);
  }, []);

  // Permissions
  const role = roles ? (roles || []).find((r) => r.name === user?.role) : null;
  const can = useCallback(
    (perm) => {
      if (user?.role === "Super Admin") return true;
      if (!roles || !role) return false;
      return (role.permissions || []).includes(perm);
    },
    [roles, role, user?.role],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "n" &&
        can("blogs.create")
      ) {
        e.preventDefault();
        navigate("editor", { id: null });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [theme, setTheme, navigate]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("ss_collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  const readOne = (n) => {
    if (!n.read) api2("/notifications/" + n.id + "/read", "PUT");
    notifMutate(
      (list) =>
        list
          ? list.map((x) => (x.id === n.id ? { ...x, read: true } : x))
          : list,
      { revalidate: true },
    );
  };
  const readAll = () => {
    api2("/notifications/read-all", "POST");
    notifMutate(
      (list) => (list ? list.map((x) => ({ ...x, read: true })) : list),
      { revalidate: true },
    );
  };

  const counts = {
    draft: stats?.statusCounts?.draft || 0,
    scheduled: stats?.statusCounts?.scheduled || 0,
    issues:
      (issuesData?.summary?.critical || 0) +
        (issuesData?.summary?.warnings || 0) || 0,
  };

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!user)
    return (
      <LoginForm
        onSuccess={(nextUser) => {
          setUser(nextUser);
        }}
      />
    );

  const renderView = () => {
    const p = view.params || {};
    switch (view.name) {
      case "dashboard":
        return <Dashboard user={user} navigate={navigate} can={can} />;
      case "blogs":
        return (
          <Blogs
            statusFilter={p.status || null}
            navigate={navigate}
            can={can}
          />
        );
      case "drafts":
        return <Blogs statusFilter="draft" navigate={navigate} can={can} />;
      case "scheduled":
        return <Blogs statusFilter="scheduled" navigate={navigate} can={can} />;
      case "schedule":
        return <ScheduleView navigate={navigate} can={can} />;
      case "published":
        return <Blogs statusFilter="published" navigate={navigate} can={can} />;
      case "archived":
        return <Blogs statusFilter="archived" navigate={navigate} can={can} />;
      case "blog":
        return <BlogDetail blogId={p.id} navigate={navigate} can={can} />;
      case "media":
        return (
          <Media
            navigate={navigate}
            can={can}
            initialUpload={p.upload}
            key={JSON.stringify(p)}
          />
        );
      case "seo-overview":
        return <SeoOverview navigate={navigate} />;
      case "issues":
        return <SeoIssues navigate={navigate} />;
      case "optimization":
        return <ContentOptimization navigate={navigate} />;
      case "keywords":
        return <Keywords navigate={navigate} can={can} />;
      case "analytics":
        return <AnalyticsView initialTab={p.tab} key={p.tab} />;
      case "team":
        return <Team user={user} can={can} />;
      case "roles":
        return <Roles can={can} />;
      case "activity":
        return <ActivityView />;
      case "settings":
        return <SettingsView tab={p.tab} user={user} />;
      default:
        return <Dashboard user={user} navigate={navigate} can={can} />;
    }
  };

  // Full-screen editor
  if (view.name === "editor") {
    return (
      <BlogEditor
        blogId={view.params?.id || null}
        navigate={navigate}
        can={can}
        user={user}
        focus={view.params?.focus}
        key={(view.params?.id || "new") + (view.params?.focus || "")}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-x-clip">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block sticky top-0 h-screen shrink-0 z-40"
        style={{ width: collapsed ? 68 : 264 }}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          view={view}
          navigate={navigate}
          can={can}
          counts={counts}
          user={user}
        />
      </aside>

      {/* Mobile nav sheet */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <Sidebar
            isMobile
            collapsed={false}
            onToggleCollapsed={() => {}}
            view={view}
            navigate={navigate}
            can={can}
            counts={counts}
            user={user}
            onCloseMobile={() => setMobileNav(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title={navTitle(view)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNav(true)}
          notifications={notifications || []}
          onReadAll={readAll}
          onReadOne={readOne}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 px-4 lg:px-6 py-6 pb-24 lg:pb-10 w-full max-w-[1500px] mx-auto">
          {renderView()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)]">
        <div className="flex items-center justify-around">
          {[
            {
              icon: Home,
              label: "Home",
              onClick: () => navigate("dashboard", {}),
              active: view.name === "dashboard",
            },
            {
              icon: FileText,
              label: "Blogs",
              onClick: () => navigate("blogs", {}),
              active: [
                "blogs",
                "drafts",
                "published",
                "scheduled",
                "archived",
                "blog",
              ].includes(view.name),
            },
            {
              icon: Plus,
              label: "Create",
              onClick: () => navigate("editor", { id: null }),
              active: view.name === "editor",
              primary: true,
            },
            {
              icon: Images,
              label: "Media",
              onClick: () => navigate("media", {}),
              active: view.name === "media",
            },
            {
              icon: Menu,
              label: "More",
              onClick: () => setMobileNav(true),
              active: false,
            },
          ].map((it, i) => (
            <button
              key={i}
              onClick={it.onClick}
              className={
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors " +
                (it.active ? "text-primary" : "text-muted-foreground")
              }
            >
              <span
                className={
                  it.primary
                    ? "h-10 w-10 -mt-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30"
                    : ""
                }
              >
                <it.icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-medium">{it.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        q={searchQ}
        setQ={setSearchQ}
        navigate={(name, params) => {
          navigate(name, params);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

function api2(path, method) {
  // Removed legacy user retrieval
  fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

function SearchDialog({ open, onOpenChange, q, setQ, navigate }) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isLoading } = useSWR(
    open && debounced ? "/api/search?q=" + encodeURIComponent(debounced) : null,
    fetcher,
  );

  const groups = useMemo(() => {
    if (!data) return [];
    const g = [
      {
        label: "Blogs",
        icon: FileText,
        items: (data.blogs || []).map((b) => ({
          id: b.id,
          title: b.title,
          sub: b.status,
          go: () => navigate("blog", { id: b.id }),
        })),
      },
      {
        label: "Media",
        icon: Images,
        items: (data.media || []).map((m) => ({
          id: m.id,
          title: m.name,
          sub: "media",
          go: () => navigate("media", {}),
        })),
      },
      {
        label: "Keywords",
        icon: Search,
        items: (data.keywords || []).map((k) => ({
          id: k.id,
          title: k.keyword,
          sub: "keyword",
          go: () => navigate("keywords", {}),
        })),
      },
      {
        label: "People",
        icon: FileText,
        items: (data.users || []).map((u) => ({
          id: u.id,
          title: u.name,
          sub: u.role,
          go: () => navigate("team", {}),
        })),
      },
    ];
    return g.filter((x) => x.items.length);
  }, [data, navigate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Quick search</DialogTitle>
        <DialogDescription className="sr-only">
          Search across blogs, keywords, media, and people
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blogs, keywords, media, people…"
            className="border-0 shadow-none focus-visible:ring-0 h-12 text-[15px]"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto p-2">
          {!data && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Type to search across the workspace…
            </p>
          )}
          {data && groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No results for “{debounced}”
            </p>
          )}
          {groups.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                {g.label}
              </p>
              {g.items.map((it) => (
                <button
                  key={g.label + it.id}
                  onClick={it.go}
                  className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-accent text-left transition-colors"
                >
                  <g.icon className="h-4 w-4 text-violet-500 shrink-0" />
                  <span className="text-[13.5px] font-medium truncate flex-1">
                    {it.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize font-normal shrink-0"
                  >
                    {it.sub}
                  </Badge>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="ss-kbd">↵</span> open ·{" "}
          <span className="ss-kbd">esc</span> close
        </div>
      </DialogContent>
    </Dialog>
  );
}
