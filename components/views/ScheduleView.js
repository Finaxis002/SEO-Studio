"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
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
import { api, fetcher, fmtDate, fmtDateTime } from "@/lib/client";
import { StatusBadge, EmptyState, ScheduleDialog } from "../bits";
import dayjs from "dayjs";

export default function ScheduleView({ navigate, can }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [resched, setResched] = useState(null);
  const { data: blogs, mutate } = useSWR(
    "/api/blogs?limit=100&status=scheduled,published",
    fetcher,
  );

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
              return (
                <div
                  key={i}
                  className={
                    "min-h-[92px] rounded-lg border p-1.5 " +
                    (day
                      ? "border-border bg-card"
                      : "border-transparent bg-muted/20")
                  }
                >
                  {day && (
                    <>
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
                      <div className="mt-1 space-y-1">
                        {evs.slice(0, 2).map((b) => (
                          <button
                            key={b.id}
                            onClick={() => navigate("blog", { id: b.id })}
                            className={
                              "w-full text-left text-[10px] font-medium rounded px-1.5 py-1 truncate block " +
                              (b.status === "scheduled"
                                ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300")
                            }
                          >
                            {b.status === "scheduled" ? "⏰ " : ""}
                            {b.title}
                          </button>
                        ))}
                        {evs.length > 2 && (
                          <span className="text-[9.5px] text-muted-foreground pl-1">
                            +{evs.length - 2} more
                          </span>
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
        <div className="px-4 py-3 border-b border-border font-semibold text-[14px]">
          This month ({monthEvents.length})
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
                  onClick={() => navigate("blog", { id: b.id })}
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
                        onClick={() => navigate("editor", { id: b.id })}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("blog", { id: b.id })}
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
    </div>
  );
}
