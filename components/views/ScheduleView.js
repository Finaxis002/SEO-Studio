"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate as swrMutate, preload } from "swr";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Globe,
  MoreHorizontal,
  Pencil,
  Eye,
  XCircle,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, fetcher, fmtDate, fmtDateTime } from "@/lib/client";
import { StatusBadge, EmptyState, ScheduleDialog } from "../bits";
import dayjs from "dayjs";

export default function ScheduleView({ navigate, can }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [resched, setResched] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const month = useMemo(
    () =>
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + monthOffset,
        1,
      ),
    [monthOffset],
  );
  const year = month.getFullYear(),
    mon = month.getMonth();

  const fromDate = useMemo(
    () => dayjs(month).startOf("month").toISOString(),
    [month],
  );
  const toDate = useMemo(
    () => dayjs(month).endOf("month").toISOString(),
    [month],
  );

  const calendarQuery = useMemo(
    () =>
      `/api/blogs?limit=500&status=scheduled,published&fields=calendar&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
    [fromDate, toDate],
  );

  const { data: blogs, mutate } = useSWR(calendarQuery, fetcher, {
    keepPreviousData: true,
  });

  // Preload Next & Previous Months in background for 0ms instant month switching
  useEffect(() => {
    const nextM = new Date(year, mon + 1, 1);
    const prevM = new Date(year, mon - 1, 1);
    const nextFrom = dayjs(nextM).startOf("month").toISOString();
    const nextTo = dayjs(nextM).endOf("month").toISOString();
    const prevFrom = dayjs(prevM).startOf("month").toISOString();
    const prevTo = dayjs(prevM).endOf("month").toISOString();

    preload(
      `/api/blogs?limit=500&status=scheduled,published&fields=calendar&from=${encodeURIComponent(nextFrom)}&to=${encodeURIComponent(nextTo)}`,
      fetcher,
    );
    preload(
      `/api/blogs?limit=500&status=scheduled,published&fields=calendar&from=${encodeURIComponent(prevFrom)}&to=${encodeURIComponent(prevTo)}`,
      fetcher,
    );
  }, [year, mon]);

  const openBlog = (b) => {
    if (b?.id) {
      preload("/api/blogs/" + b.id, fetcher);
      swrMutate("/api/blogs/" + b.id, (prev) => prev || b, false);
    }
    navigate("blog", { id: b.id });
  };
  const firstDay = new Date(year, mon, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mon, d));

  const eventsByDay = (day) => {
    if (!day) return [];
    return (blogs?.items || []).filter((b) => {
      const ref = b.status === "scheduled" ? b.scheduledAt : b.publishedAt;
      return ref && dayjs(ref).isSame(dayjs(day), "day");
    });
  };

  const monthEvents = (blogs?.items || [])
    .filter((b) => {
      const ref = b.status === "scheduled" ? b.scheduledAt : b.publishedAt;
      return ref && dayjs(ref).isSame(dayjs(month), "month");
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt || a.publishedAt) -
        new Date(b.scheduledAt || b.publishedAt),
    );

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            Publishing Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scheduled and published blogs at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset(monthOffset - 1)}
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-36 text-center capitalize">
            {month.toLocaleString("en", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonthOffset(monthOffset + 1)}
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="card-hover overflow-hidden">
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1.5 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-center text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              const evs = eventsByDay(day);
              const isToday = day && dayjs(day).isSame(dayjs(), "day");
              const pubCount = evs.filter((b) => b.status === "published").length;
              const schedCount = evs.filter((b) => b.status === "scheduled").length;

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (day && evs.length > 0) {
                      setSelectedDay({ date: day, events: evs });
                    }
                  }}
                  className={
                    "min-h-[96px] rounded-lg border p-1.5 flex flex-col justify-between " +
                    (day
                      ? "border-border bg-card " + (evs.length > 0 ? "cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-colors" : "")
                      : "border-transparent bg-muted/20")
                  }
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={
                            "text-[11px] font-bold " +
                            (isToday
                              ? "text-white bg-violet-600 rounded-full w-5 h-5 inline-flex items-center justify-center"
                              : "text-muted-foreground")
                          }
                        >
                          {day.getDate()}
                        </span>

                        {/* Accurate counts for published & scheduled on this day */}
                        <div className="flex items-center gap-1">
                          {pubCount > 0 && (
                            <span
                              title={`${pubCount} Published`}
                              className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            >
                              🟢 {pubCount}
                            </span>
                          )}
                          {schedCount > 0 && (
                            <span
                              title={`${schedCount} Scheduled`}
                              className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                            >
                              ⏰ {schedCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 space-y-1">
                        {evs.slice(0, 2).map((b) => (
                          <button
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openBlog(b);
                            }}
                            className={
                              "w-full text-left text-[10px] font-medium rounded px-1.5 py-1 truncate block " +
                              (b.status === "scheduled"
                                ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300")
                            }
                          >
                            {b.status === "scheduled" ? "⏰ " : "🟢 "}
                            {b.title}
                          </button>
                        ))}
                        {evs.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay({ date: day, events: evs });
                            }}
                            className="text-[9.5px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 hover:underline pl-1 block text-left transition-colors cursor-pointer"
                          >
                            +{evs.length - 2} more
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between font-semibold text-[14px]">
          <span>This month ({monthEvents.length})</span>
          {monthEvents.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
              {monthEvents.filter((b) => b.status === "published").length > 0 && (
                <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  {monthEvents.filter((b) => b.status === "published").length} published
                </span>
              )}
              {monthEvents.filter((b) => b.status === "scheduled").length > 0 && (
                <span className="flex items-center gap-1 font-medium text-violet-700 dark:text-violet-400">
                  <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
                  {monthEvents.filter((b) => b.status === "scheduled").length} scheduled
                </span>
              )}
            </div>
          )}
        </div>
        {monthEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled this month"
            description="Schedule blogs from the editor to see them here."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {monthEvents.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                {b.status === "scheduled" ? (
                  <CalendarClock className="h-4 w-4 text-violet-500" />
                ) : (
                  <Globe className="h-4 w-4 text-emerald-500" />
                )}
                <button
                  onClick={() => openBlog(b)}
                  className="text-[13px] font-medium flex-1 text-left truncate hover:text-primary transition-colors"
                >
                  {b.title}
                </button>
                <span className="text-[12px] text-muted-foreground hidden sm:block">
                  {b.status === "scheduled"
                    ? "Publishes " + fmtDateTime(b.scheduledAt)
                    : "Published " + fmtDate(b.publishedAt)}
                </span>
                <StatusBadge status={b.status} />
                {b.status === "scheduled" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          preload("/api/blogs/" + b.id, fetcher);
                          swrMutate("/api/blogs/" + b.id, (prev) => prev || b, false);
                          navigate("editor", { id: b.id });
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          preload("/api/blogs/" + b.id, fetcher);
                          swrMutate("/api/blogs/" + b.id, (prev) => prev || b, false);
                          navigate("blog", { id: b.id });
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      {can("blogs.schedule") && (
                        <DropdownMenuItem onClick={() => setResched(b)}>
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Reschedule
                        </DropdownMenuItem>
                      )}
                      {can("blogs.schedule") && (
                        <DropdownMenuItem
                          className="text-rose-600"
                          onClick={() =>
                            api("/blogs/" + b.id + "/transition", {
                              method: "POST",
                              body: { to: "draft" },
                            }).then(() => {
                              toast.success(
                                "Schedule cancelled — moved to drafts",
                              );
                              mutate();
                            })
                          }
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel schedule
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ScheduleDialog
        open={!!resched}
        onOpenChange={(o) => !o && setResched(null)}
        blogTitle={resched?.title || ""}
        scheduledAt={resched?.scheduledAt}
        status="scheduled"
        onConfirm={(iso) => {
          const b = resched;
          api("/blogs/" + b.id + "/transition", {
            method: "POST",
            body: { to: "scheduled", scheduledAt: iso },
          })
            .then(() => {
              toast.success("Rescheduled successfully");
              setResched(null);
              mutate();
            })
            .catch((e) => toast.error(e.message));
        }}
      />

      {/* Day Events Dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              {selectedDay?.date
                ? dayjs(selectedDay.date).format("dddd, D MMMM YYYY")
                : "Blogs on this date"}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.events?.length || 0}{" "}
              {selectedDay?.events?.length === 1 ? "blog" : "blogs"} scheduled or published on this date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {(selectedDay?.events || []).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {b.status === "scheduled" ? (
                    <CalendarClock className="h-4 w-4 text-violet-500 shrink-0" />
                  ) : (
                    <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => {
                        setSelectedDay(null);
                        openBlog(b);
                      }}
                      className="text-sm font-medium text-left truncate block hover:text-primary transition-colors hover:underline w-full"
                      title={b.title}
                    >
                      {b.title}
                    </button>
                    <span className="text-[11px] text-muted-foreground block">
                      {b.status === "scheduled"
                        ? "⏰ Publishes " + fmtDateTime(b.scheduledAt)
                        : "Published " + fmtDate(b.publishedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={b.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      preload("/api/blogs/" + b.id, fetcher);
                      swrMutate("/api/blogs/" + b.id, (prev) => prev || b, false);
                      setSelectedDay(null);
                      navigate("editor", { id: b.id });
                    }}
                    title="Edit blog"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {can("blogs.schedule") && b.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setResched(b);
                      }}
                      title="Reschedule"
                    >
                      <CalendarClock className="h-3.5 w-3.5 mr-1" /> Reschedule
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
