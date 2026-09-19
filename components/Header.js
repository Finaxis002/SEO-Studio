"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  UserPlus,
  TrendingUp,
  CalendarClock,
  ChevronDown,
  BadgeCheck,
  LogOut,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { timeAgo, initials } from "@/lib/client";

const NOTIF_ICON = {
  publish: {
    icon: CheckCircle2,
    cls: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60",
  },
  schedule: {
    icon: CalendarClock,
    cls: "text-violet-500 bg-violet-50 dark:bg-violet-950/60",
  },
  review: { icon: Eye, cls: "text-amber-500 bg-amber-50 dark:bg-amber-950/60" },
  seo: {
    icon: AlertTriangle,
    cls: "text-rose-500 bg-rose-50 dark:bg-rose-950/60",
  },
  team: { icon: UserPlus, cls: "text-sky-500 bg-sky-50 dark:bg-sky-950/60" },
  keyword: {
    icon: TrendingUp,
    cls: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60",
  },
};

export default function Header({
  onOpenSearch,
  onOpenMobileNav,
  notifications = [],
  onReadAll,
  onReadOne,
  user,
  onLogout,
  title,
}) {
  const { theme, setTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const searchShortcut = isMac ? "⌘K" : "Ctrl+Shift+K";
  const themeShortcut = isMac ? "⌘J" : "Ctrl+J";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 lg:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:block">
        <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={onOpenSearch}
        className="hidden sm:flex items-center gap-2 h-9 w-64 lg:w-80 rounded-full border border-border bg-muted/50 px-3.5 text-sm text-muted-foreground hover:bg-muted hover:border-violet-300 transition-colors shadow-sm"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left truncate">
          Search blogs, keywords, media…
        </span>
        <span className="ss-kbd">{searchShortcut}</span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={onOpenSearch}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Help */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="h-[18px] w-[18px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4">
          <p className="font-semibold text-sm mb-1">Need a hand?</p>
          <p className="text-[13px] text-muted-foreground mb-3">
            Quick shortcuts for power users.
          </p>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span>Global search</span>
              <span className="ss-kbd">{searchShortcut}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle theme</span>
              <span className="ss-kbd">{themeShortcut}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[380px] p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-7"
                onClick={onReadAll}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[360px]">
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                You are all caught up 🎉
              </p>
            )}
            {notifications.map((n) => {
              const meta = NOTIF_ICON[n.type] || NOTIF_ICON.publish;
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => onReadOne(n)}
                  className={
                    "w-full flex gap-3 px-4 py-3 text-left hover:bg-accent/60 transition-colors border-b border-border/60 " +
                    (!n.read ? "bg-violet-50/40 dark:bg-violet-950/20" : "")
                  }
                >
                  <span
                    className={
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 " +
                      meta.cls
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                      )}
                    </span>
                    <span className="block text-[12.5px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                      {n.message}
                    </span>
                    <span className="block text-[11px] text-muted-foreground/80 mt-1">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Theme */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-[18px] w-[18px] dark:hidden" />
        <Moon className="h-[18px] w-[18px] hidden dark:block" />
      </Button>

      <Separator orientation="vertical" className="h-7 hidden sm:block" />

      {/* User */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-bold">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block text-left">
              <p className="text-[13px] font-semibold leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {user?.role}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-[11px] font-bold">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[13px] font-semibold">{user?.name}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <div className="px-2 pb-2">
            <Badge
              variant="outline"
              className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900 text-[11px]"
            >
              <BadgeCheck className="h-3 w-3 mr-1" />
              {user?.role}
            </Badge>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
            <Monitor className="h-4 w-4 mr-2" /> Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 dark:text-rose-400"
            onSelect={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Shortcuts dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Move faster through SEO Studio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            {[
              ["⌘K", "Open global search"],
              ["⌘J", "Toggle dark mode"],
              ["Esc", "Close dialogs"],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-muted-foreground">{d}</span>
                <span className="ss-kbd">{k}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
