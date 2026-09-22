import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function authHeaders(extra) {
  return Object.assign({ "Content-Type": "application/json" }, extra || {});
}

export async function api(path, opts = {}) {
  const headers = {};
  if (!opts.raw) headers["Content-Type"] = "application/json";
  const res = await fetch("/api" + path, {
    method: opts.method || "GET",
    headers,
    body:
      opts.body !== undefined
        ? opts.raw
          ? opts.body
          : JSON.stringify(opts.body)
        : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    throw new Error(
      (data && data.error) || "Request failed (" + res.status + ")",
    );
  }
  return data;
}

export const fetcher = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(
      (data && data.error) || "Request failed (" + res.status + ")",
    );
    err.status = res.status;
    err.info = data;
    throw err;
  }
  return data;
};

export function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1000000)
    return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1000)
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

export function fmtDate(iso) {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY");
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY · h:mm A");
}

export function timeAgo(iso) {
  if (!iso) return "—";
  return dayjs(iso).fromNow();
}

export function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map(
          (c) =>
            '"' +
            String(c === null || c === undefined ? "" : c).replace(/"/g, '""') +
            '"',
        )
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const STATUS_META = {
  draft: {
    label: "Draft",
    cls: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700",
  },
  in_review: {
    label: "In Review",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  },
  approved: {
    label: "Approved",
    cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  },
  scheduled: {
    label: "Scheduled",
    cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  },
  published: {
    label: "Published",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  },
  archived: {
    label: "Archived",
    cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700",
  },
};

export const SEVERITY_META = {
  critical: {
    label: "Critical",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  },
  warning: {
    label: "Warning",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  },
};

export const CATEGORIES = [
  "SEO Fundamentals",
  "Technical SEO",
  "Content Marketing",
  "Link Building",
  "Local SEO",
  "Keyword Research",
  "Analytics & Reporting",
  "Digital Marketing",
];

export const SUBCATEGORIES = [
  "Audits",
  "Guides",
  "Strategy",
  "Playbooks",
  "Optimization",
  "Checklists",
  "Tools",
  "Trends",
];

export const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Australia/Sydney",
];

export const TIME_AGO_SHORT = (iso) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};

export function getVinimayBlogUrl(slug, customBase) {
  if (!slug) return "#";
  const base = (
    customBase ||
    process.env.NEXT_PUBLIC_VINIMAY_URL ||
    (typeof window !== "undefined" && window.__VINIMAY_URL) ||
    "http://localhost:8678"
  ).replace(/\/$/, "");
  return `${base}/blogs/${encodeURIComponent(slug)}`;
}
