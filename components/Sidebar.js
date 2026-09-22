"use client";

import {
  LayoutDashboard,
  FileText,
  PenLine,
  FileEdit,
  CalendarClock,
  CalendarDays,
  Globe,
  Archive,
  Images,
  Gauge,
  KeyRound,
  Wand2,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Search,
  Users,
  ShieldCheck,
  History,
  Settings,
  SlidersHorizontal,
  Send,
  UserCircle,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/client";

export const NAV = [
  {
    group: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    group: "Content",
    items: [
      {
        key: "blogs",
        label: "All Blogs",
        icon: FileText,
        badge: "all",
        perm: "blogs.view",
      },
      {
        key: "create",
        label: "Create Blog",
        icon: PenLine,
        perm: "blogs.create",
        view: {
          name: "editor",
          id: null,
        },
      },
      {
        key: "drafts",
        label: "Drafts",
        icon: FileEdit,
        perm: "blogs.view",
        params: {
          status: "draft",
        },
        badge: "draft",
      },
      {
        key: "scheduled",
        label: "Scheduled",
        icon: CalendarClock,
        perm: "blogs.view",
        params: {
          status: "scheduled",
        },
        badge: "scheduled",
      },
      {
        key: "schedule",
        label: "Publishing Calendar",
        icon: CalendarDays,
        perm: "blogs.view",
        view: {
          name: "schedule",
        },
      },
      {
        key: "published",
        label: "Published",
        icon: Globe,
        perm: "blogs.view",
        params: {
          status: "published",
        },
      },
      {
        key: "archived",
        label: "Archived",
        icon: Archive,
        perm: "blogs.view",
        params: {
          status: "archived",
        },
      },
    ],
  },
  {
    group: "Media",
    items: [
      {
        key: "media",
        label: "Media Library",
        icon: Images,
        perm: "media.view",
      },
    ],
  },
  {
    group: "SEO",
    items: [
      {
        key: "seo-overview",
        label: "SEO Overview",
        icon: Gauge,
        perm: "seo.view",
      },
      {
        key: "keywords",
        label: "Keyword Manager",
        icon: KeyRound,
        perm: "seo.view",
      },
      {
        key: "optimization",
        label: "Content Optimization",
        icon: Wand2,
        perm: "seo.view",
      },
      {
        key: "issues",
        label: "SEO Issues",
        icon: ShieldAlert,
        badge: "issues",
        perm: "seo.issues.view",
      },
    ],
  },
  {
    group: "Analytics",
    items: [
      {
        key: "analytics",
        label: "Blog Performance",
        icon: BarChart3,
        perm: "analytics.view",
      },
      {
        key: "analytics",
        label: "Traffic",
        icon: TrendingUp,
        perm: "analytics.view",
        params: {
          tab: "traffic",
        },
      },
      {
        key: "analytics",
        label: "Search Performance",
        icon: Search,
        perm: "analytics.view",
        params: {
          tab: "search",
        },
      },
    ],
  },
  {
    group: "Management",
    items: [
      {
        key: "team",
        label: "Team",
        icon: Users,
        perm: "team.view",
      },
      {
        key: "roles",
        label: "Roles & Permissions",
        icon: ShieldCheck,
        perm: "team.roles",
      },
      {
        key: "activity",
        label: "Activity Logs",
        icon: History,
        perm: "team.view",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: Settings,
        perm: "settings.view",
        params: {
          tab: "general",
        },
      },
    ],
  },
];

export function navTitle(view) {
  if (view.name === "schedule") {
    return "Publishing Calendar";
  }
  if (view.name === "editor") {
    return view.params?.id || view.id ? "Edit Blog" : "Create New Blog";
  }
  if (view.name === "blog") {
    return "Blog Detail";
  }

  for (const g of NAV) {
    for (const it of g.items) {
      const sameView = (it.view ? it.view.name : it.key) === view.name;

      const sameParams =
        !it.params ||
        (view.params &&
          Object.entries(it.params).every(([k, v]) => view.params[k] === v));

      if (sameView && sameParams) {
        return it.label;
      }
    }
  }

  return "Dashboard";
}

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  view,
  navigate,
  can,
  counts = {},
  user,
  isMobile = false,
  onCloseMobile,
}) {
  const isActive = (it) => {
    const target = it.view ? it.view.name : it.key;

    if (target !== view.name) {
      return false;
    }

    if (it.params && view.params) {
      return Object.entries(it.params).every(([k, v]) => view.params[k] === v);
    }

    if (it.params || view.params) {
      return it.params ? false : !Object.keys(view.params || {}).length;
    }

    return true;
  };

  const badgeValue = (key) => {
    if (key === "draft" || key === "all") {
      return undefined;
    }

    return counts[key] || undefined;
  };

  const handleNav = (it) => {
    const target = it.view || {
      name: it.key,
      params: it.params || undefined,
    };

    navigate(target.name, target.params);

    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div
      className={
        "fixed left-0 top-0 z-40 h-screen overflow-hidden flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 " +
        (collapsed && !isMobile ? "w-[68px]" : "w-[264px]")
      }
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 shrink-0 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0">
          <Sparkles
            className="h-4.5 w-4.5 text-white"
            style={{
              width: 18,
              height: 18,
            }}
          />
        </div>

        {(!collapsed || isMobile) && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] tracking-tight text-foreground leading-tight">
              SEO Studio
            </p>

            <p className="text-[11px] text-muted-foreground">
              Content operations
            </p>
          </div>
        )}

        {!isMobile && (
          <button
            onClick={onToggleCollapsed}
            className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          {NAV.map((g) => {
            const items = g.items.filter(
              (it) => !it.perm || (can && can(it.perm)),
            );

            if (!items.length) {
              return null;
            }

            return (
              <div key={g.group}>
                {(!collapsed || isMobile) && (
                  <p className="px-2.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {g.group}
                  </p>
                )}

                <div className="space-y-0.5">
                  {items.map((it) => {
                    const Icon = it.icon;
                    const active = isActive(it);

                    const badge =
                      it.badge === "issues"
                        ? counts.issues
                        : it.badge === "draft"
                          ? counts.draft
                          : it.badge === "scheduled"
                            ? counts.scheduled
                            : undefined;

                    const content = (
                      <button
                        onClick={() => handleNav(it)}
                        className={
                          "w-full flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13.5px] font-medium transition-all " +
                          (active
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent")
                        }
                        style={
                          collapsed && !isMobile
                            ? {
                                justifyContent: "center",
                                paddingLeft: 0,
                                paddingRight: 0,
                              }
                            : {}
                        }
                      >
                        <Icon
                          className="h-[17px] w-[17px] shrink-0"
                          style={
                            active
                              ? {
                                  color: "hsl(262 83% 58%)",
                                }
                              : {}
                          }
                        />

                        {(!collapsed || isMobile) && (
                          <span className="truncate flex-1 text-left">
                            {it.label}
                          </span>
                        )}

                        {(!collapsed || isMobile) &&
                          badge !== undefined &&
                          badge > 0 && (
                            <Badge
                              variant="outline"
                              className={
                                "h-5 px-1.5 text-[10.5px] rounded-full font-semibold " +
                                (it.badge === "issues"
                                  ? "border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-300"
                                  : "border-violet-200 text-violet-600 dark:border-violet-900 dark:text-violet-300")
                              }
                            >
                              {badge}
                            </Badge>
                          )}
                      </button>
                    );

                    if (collapsed && !isMobile) {
                      return (
                        <Tooltip key={it.label}>
                          <TooltipTrigger asChild>{content}</TooltipTrigger>

                          <TooltipContent side="right" sideOffset={8}>
                            {it.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={it.label}>{content}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* User */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          onClick={() => {
            navigate("settings", {
              tab: "profile",
            });

            if (isMobile && onCloseMobile) {
              onCloseMobile();
            }
          }}
          className={
            "w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-accent transition-colors text-left " +
            (collapsed && !isMobile ? "justify-center" : "")
          }
        >
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-bold">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>

          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {user?.name}
              </p>

              <p className="text-[11px] text-muted-foreground truncate">
                {user?.role}
              </p>
            </div>
          )}
        </button>

        {collapsed && !isMobile && (
          <button onClick={onToggleCollapsed} className="sr-only">
            Expand
          </button>
        )}
      </div>
    </div>
  );
}
