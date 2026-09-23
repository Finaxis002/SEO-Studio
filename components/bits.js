"use client";

import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Inbox,
  RotateCcw,
  CalendarClock,
  Search,
  Check,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";

dayjs.extend(relativeTime);
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkline } from "./charts";
import { STATUS_META, SEVERITY_META, timeAgo, TIMEZONES } from "@/lib/client";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  iconBg = "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300",
  spark = [],
  sparkColor = "#7c3aed",
  invertDelta = false,
  suffix = "",
}) {
  const up = delta >= 0;
  const good = invertDelta ? !up : up;
  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {label}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold tracking-tight leading-none">
                {typeof value === "number" ? value.toLocaleString() : value}
                {suffix}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={
                  "inline-flex items-center gap-0.5 font-semibold " +
                  (good
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400")
                }
              >
                {up ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(delta).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
          <div
            className={
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 " +
              iconBg
            }
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 -mx-5 -mb-5 opacity-90">
          <Sparkline data={spark} color={sparkColor} height={38} />
        </div>
      </CardContent>
    </Card>
  );
}

export function ScoreRing({
  value = 0,
  size = 68,
  thickness = 7,
  showLabel = true,
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "#10b981" : value >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(240 6% 90%)"
          strokeWidth={thickness}
          className="dark:opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={(value / 100) * c + " " + c}
          style={{ transition: "stroke-dasharray .5s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size / 3.4 }}
          >
            {value}
          </span>
          {size > 56 && (
            <span className="text-[9px] text-muted-foreground font-medium mt-0.5">
              / 100
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: "" };
  return (
    <Badge
      variant="outline"
      className={
        "font-medium px-2.5 py-0.5 rounded-full text-[11.5px] " + m.cls
      }
    >
      {m.label}
    </Badge>
  );
}

export function SevBadge({ severity }) {
  const m = SEVERITY_META[severity] || { label: severity, cls: "" };
  return (
    <Badge
      variant="outline"
      className={
        "font-medium px-2.5 py-0.5 rounded-full text-[11.5px] " + m.cls
      }
    >
      {m.label}
    </Badge>
  );
}

export function DeltaBadge({ delta }) {
  const up = delta >= 0;
  return (
    <span
      className={
        "inline-flex items-center gap-1 text-xs font-semibold " +
        (up
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400")
      }
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}{" "}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-50 dark:from-violet-950/60 dark:to-indigo-950/40 flex items-center justify-center mb-5 border border-violet-100 dark:border-violet-900">
        <Icon className="h-7 w-7 text-violet-500 dark:text-violet-300" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 6 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-14 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 hidden md:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ n = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-full mt-3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Unable to load data. Please try again.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900">
        <AlertTriangle className="h-6 w-6 text-rose-500" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  destructive = true,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ChipInput({
  value = [],
  onChange,
  placeholder = "Add and press Enter…",
  className = "",
  onChipClick,
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim().replace(/,$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div
      className={
        "flex flex-wrap items-center gap-1.5 min-h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring/30 " +
        className
      }
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900 pl-2 pr-1 py-0.5 text-xs font-medium"
        >
          {onChipClick ? (
            <button
              type="button"
              className="hover:underline cursor-pointer"
              onClick={() => onChipClick(t)}
            >
              {t}
            </button>
          ) : (
            t
          )}
          <button
            type="button"
            className="hover:bg-violet-200/60 dark:hover:bg-violet-900 rounded p-0.5"
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            <XCircle className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-24 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && !draft && value.length)
            onChange(value.slice(0, -1));
        }}
        onBlur={commit}
      />
    </div>
  );
}

export function Labeled({ label, children, hint, required, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-foreground/90"
      >
        {label} {required && <span className="text-destructive">*</span>}
        {hint && (
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export function CharCount({ value, max, min }) {
  const n = (value || "").length;
  const ok = n > 0 && n <= max && (!min || n >= min);
  return (
    <span
      className={
        "text-[11px] font-semibold tabular-nums " +
        (ok
          ? "text-emerald-600 dark:text-emerald-400"
          : n === 0
            ? "text-muted-foreground"
            : "text-amber-600 dark:text-amber-400")
      }
    >
      {n} / {max}
    </span>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function CheckItem({ status, children }) {
  return (
    <div className="flex items-start gap-2.5">
      {status === "pass" && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      )}
      {status === "warn" && (
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      )}
      {status === "fail" && (
        <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
      )}
      <span className="text-[13px] leading-snug">{children}</span>
    </div>
  );
}

const REVISION_REASONS = [
  "Keyword Optimization",
  "SEO Meta & Title",
  "Content Quality & Depth",
  "Headings & Hierarchy",
  "Images & Alt Text",
  "Internal & External Links",
  "Grammar & Formatting",
  "Tone & Brand Alignment",
];

export function RequestChangesDialog({
  open,
  onOpenChange,
  blogTitle = "",
  onConfirm,
  loading = false,
}) {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedReasons([]);
      setNote("");
    }
  }, [open]);

  const toggleReason = (reason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  const canSubmit = selectedReasons.length > 0 || note.trim().length > 0;

  const handleConfirm = () => {
    if (!canSubmit || loading) return;
    onConfirm?.({
      reasons: selectedReasons,
      note: note.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
              <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Request Changes & Revisions
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {blogTitle ? (
              <>
                Sending{" "}
                <span className="font-medium text-foreground">
                  "{blogTitle}"
                </span>{" "}
                back to draft. Let the author know what needs improvement.
              </>
            ) : (
              "Send this blog back to draft. Let the author know what needs improvement."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Revision Areas (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REVISION_REASONS.map((r) => {
                const active = selectedReasons.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleReason(r)}
                    className={
                      "text-xs px-2.5 py-1 rounded-full border transition-all " +
                      (active
                        ? "bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 font-medium ring-1 ring-amber-500/30"
                        : "bg-muted/50 border-border hover:bg-accent text-muted-foreground hover:text-foreground")
                    }
                  >
                    {active ? "✓ " : "+ "}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detailed Feedback Note
              </label>
              <span className="text-[11px] text-muted-foreground">
                {note.length} / 1000
              </span>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please include the focus keyword in the intro paragraph, format H2 subheadings properly, and add alt descriptions to all uploaded images..."
              maxLength={1000}
              className="min-h-[110px] text-sm resize-none bg-muted/30"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/20"
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {loading ? "Sending..." : "Send Back for Revisions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewFeedbackAlert({
  feedback,
  onResubmit,
  canResubmit = false,
  className = "",
}) {
  if (!feedback || feedback.resolved) return null;

  return (
    <div
      className={
        "rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/40 p-4 shadow-sm space-y-2.5 " +
        className
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                Changes Requested
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-amber-400 bg-amber-100/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
              >
                Action Required
              </Badge>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Requested by{" "}
              <span className="font-medium text-amber-950 dark:text-amber-100">
                {feedback.requestedBy || "Reviewer"}
              </span>
              {feedback.requestedAt && (
                <span> · {timeAgo(feedback.requestedAt)}</span>
              )}
            </p>
          </div>
        </div>

        {canResubmit && onResubmit && (
          <Button
            size="sm"
            onClick={onResubmit}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/20 shrink-0"
          >
            Submit Revisions
          </Button>
        )}
      </div>

      {Array.isArray(feedback.reasons) && feedback.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {feedback.reasons.map((r) => (
            <span
              key={r}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/50"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {feedback.note && (
        <div className="rounded-lg bg-background/90 dark:bg-card/90 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {feedback.note}
        </div>
      )}

      <p className="text-[11.5px] text-amber-800/70 dark:text-amber-400/70 flex items-center gap-1">
        <span>💡</span> Please address the feedback above. Once ready, submit
        this draft for review again to clear revisions.
      </p>
    </div>
  );
}

export function ScheduleDialog({
  open,
  onOpenChange,
  form,
  scheduledAt,
  status,
  blogTitle = "",
  onConfirm,
  loading = false,
}) {
  const currentScheduledAt = scheduledAt || form?.scheduledAt;
  const currentStatus = status || form?.status;
  const isReschedule = currentStatus === "scheduled" || !!currentScheduledAt;
  const title = blogTitle || form?.title || "";

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [tz, setTz] = useState("Asia/Kolkata");

  useEffect(() => {
    if (open) {
      if (currentScheduledAt && dayjs(currentScheduledAt).isValid()) {
        const d = dayjs(currentScheduledAt);
        setDate(d.format("YYYY-MM-DD"));
        setTime(d.format("HH:mm"));
      } else {
        const tomorrow = dayjs().add(1, "day");
        setDate(tomorrow.format("YYYY-MM-DD"));
        setTime("10:00");
      }
    }
  }, [open, currentScheduledAt]);

  const todayStr = dayjs().format("YYYY-MM-DD");
  const isToday = date === todayStr;
  const minTimeForToday = dayjs().add(2, "minute").format("HH:mm");

  const isPast = useMemo(() => {
    if (!date || !time) return false;
    const chosen = dayjs(`${date}T${time}:00`);
    if (!chosen.isValid()) return false;
    return chosen.isBefore(dayjs().add(1, "minute"));
  }, [date, time]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-violet-500" />
            {isReschedule ? "Reschedule Publish" : "Schedule Publish"}
          </DialogTitle>
          <DialogDescription>
            {title ? (
              <>
                &ldquo;{title}&rdquo; will go live automatically at the chosen
                date and time.
              </>
            ) : (
              "The blog will go live automatically at the chosen date and time."
            )}
          </DialogDescription>
        </DialogHeader>

        {isReschedule &&
          currentScheduledAt &&
          dayjs(currentScheduledAt).isValid() && (
            <div className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-2 border border-border/60">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-violet-500" />
                Currently scheduled:
              </span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {dayjs(currentScheduledAt).format("MMM D, YYYY · h:mm A")}
              </span>
            </div>
          )}

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Publish date" required>
              <Input
                type="date"
                min={todayStr}
                value={date}
                className={
                  isPast
                    ? "border-rose-300 dark:border-rose-900 focus-visible:ring-rose-500"
                    : ""
                }
                onChange={(e) => setDate(e.target.value)}
              />
            </Labeled>
            <Labeled label="Publish time" required>
              <Input
                type="time"
                min={isToday ? minTimeForToday : undefined}
                value={time}
                className={
                  isPast
                    ? "border-rose-300 dark:border-rose-900 focus-visible:ring-rose-500"
                    : ""
                }
                onChange={(e) => setTime(e.target.value)}
              />
            </Labeled>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium mr-1">
              Quick pick:
            </span>
            <button
              type="button"
              onClick={() => {
                const d = dayjs().add(1, "hour");
                setDate(d.format("YYYY-MM-DD"));
                setTime(d.format("HH:mm"));
              }}
              className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 dark:hover:bg-violet-950/40 dark:hover:text-violet-300 dark:hover:border-violet-800 transition-colors"
            >
              +1 hour
            </button>
            <button
              type="button"
              onClick={() => {
                const d = dayjs().add(1, "day");
                setDate(d.format("YYYY-MM-DD"));
                setTime("10:00");
              }}
              className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 dark:hover:bg-violet-950/40 dark:hover:text-violet-300 dark:hover:border-violet-800 transition-colors"
            >
              Tomorrow 10 AM
            </button>
            <button
              type="button"
              onClick={() => {
                const d = dayjs().add(2, "day");
                setDate(d.format("YYYY-MM-DD"));
                setTime("10:00");
              }}
              className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 dark:hover:bg-violet-950/40 dark:hover:text-violet-300 dark:hover:border-violet-800 transition-colors"
            >
              In 2 days
            </button>
          </div>

          {isPast ? (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-150">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Scheduled time cannot be in the past
                </p>
                <p className="text-[11px] opacity-90">
                  Please pick a future date and time for this blog.
                </p>
              </div>
            </div>
          ) : date && time ? (
            <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 px-0.5">
              <span>🗓️</span>
              <span>
                Goes live on{" "}
                <strong className="text-foreground">
                  {dayjs(`${date}T${time}:00`).format("MMM D, YYYY · h:mm A")}
                </strong>{" "}
                ({dayjs(`${date}T${time}:00`).fromNow()})
              </span>
            </p>
          ) : null}

          <Labeled label="Timezone">
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger className="bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Labeled>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-700 hover:to-indigo-700 shadow-sm"
            disabled={!date || !time || isPast || loading}
            onClick={() => {
              if (isPast || !date || !time) return;
              const iso = dayjs(`${date}T${time}:00`).toISOString();
              onConfirm(iso, tz);
              onOpenChange(false);
            }}
          >
            <CalendarClock className="h-4 w-4 mr-1.5" />
            {loading
              ? "Saving..."
              : isReschedule
                ? "Update Schedule"
                : "Schedule Blog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  onAddNew,
  addNewLabel = "Add new",
  id,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          className={
            "w-full flex items-center justify-between h-9 rounded-md border border-input bg-muted/30 px-3 text-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors text-left " +
            className
          }
        >
          <span
            className={
              value
                ? "text-foreground font-medium truncate"
                : "text-muted-foreground truncate"
            }
          >
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-1.5 w-[var(--radix-popover-trigger-width)] min-w-[240px] shadow-lg z-50"
        align="start"
      >
        <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60 mb-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5">
          {filtered.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1.5">
                {emptyText}
              </p>
              {onAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                  onClick={() => {
                    const q = search.trim();
                    setOpen(false);
                    onAddNew(q);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {addNewLabel} {search ? `"${search.trim()}"` : ""}
                </Button>
              )}
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left " +
                    (isSelected
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 font-semibold"
                      : "hover:bg-accent text-foreground")
                  }
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
        {onAddNew && filtered.length > 0 && (
          <div className="pt-1 mt-1 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                const q = search.trim();
                setOpen(false);
                onAddNew(q);
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11.5px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {addNewLabel}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
