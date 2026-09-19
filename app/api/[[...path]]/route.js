import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getDb, clean } from "../../../lib/db";
import { ensureSeeded } from "../../../lib/seed";
import { analyzeSeo, slugify } from "../../../lib/seo";
import { generateOutline } from "../../../lib/gemini";
import { getGoogleAnalytics } from "../../../lib/google-analytics";
import { deleteAsset, uploadBuffer } from "../../../lib/cloudinary";
import {
  clearSessionCookie,
  createSession,
  getSessionUserId,
  hashPassword,
  sessionCookie,
  verifyPassword,
} from "../../../lib/auth";

function handleCORS(response) {
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGINS || "*",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-id",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

function esc(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_USER = {
  id: "u1",
  name: "Ayushi Sharma",
  email: "ayushi@seostudio.io",
  role: "Super Admin",
};

async function getUser(request, db) {
  const uid = getSessionUserId(request);
  if (uid) {
    const u = await db.collection("team").findOne({ id: uid });
    if (u)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
      };
  }
  return null;
}

function publicMember(member) {
  if (!member) return member;
  const { passwordHash, ...safeMember } = member;
  return safeMember;
}

async function getPerms(db, user) {
  const role = await db.collection("roles").findOne({ name: user.role });
  if (!role) return [];
  return role.permissions || [];
}

function forbidden(msg) {
  return handleCORS(
    NextResponse.json(
      { error: msg || "You do not have permission to perform this action." },
      { status: 403 },
    ),
  );
}

function readPermission(route, method, path) {
  if (method !== "GET") return null;
  if (route === "/stats" || route === "/analytics") return "analytics.view";
  if (route === "/blogs" || (path[0] === "blogs" && path.length === 2))
    return "blogs.view";
  if (route === "/media" || (path[0] === "media" && path.length === 2))
    return "media.view";
  if (route === "/keywords" || (path[0] === "keywords" && path.length === 2))
    return "seo.view";
  if (route === "/team" || (path[0] === "team" && path.length === 2))
    return "team.view";
  if (route === "/roles" || (path[0] === "roles" && path.length === 2))
    return "team.view";
  if (route === "/permissions") return "team.view";
  if (route === "/team-options") return "team.view";
  if (route === "/settings-options") return "settings.view";
  if (route === "/content-options") return "blogs.view";
  if (route === "/activity") return "team.view";
  if (route === "/seo-issues") return "seo.issues.view";
  if (route === "/settings") return "settings.view";
  if (route === "/categories") return "blogs.view";
  if (route === "/generate-outline") return "blogs.create";
  return null;
}

async function logActivity(
  db,
  user,
  action,
  resourceType,
  resource,
  details,
  status = "success",
  request,
) {
  const forwardedFor = request?.headers.get("x-forwarded-for") || "";
  const ip =
    forwardedFor.split(",")[0].trim() ||
    request?.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request?.headers.get("user-agent") || "unknown";
  await db.collection("activity").insertOne({
    id: uuidv4(),
    user: user.name,
    userId: user.id,
    userRole: user.role,
    action,
    resourceType,
    resource,
    details: details || "",
    status,
    ip,
    device: userAgent,
    createdAt: new Date().toISOString(),
  });
}

async function notify(db, type, title, message) {
  await db.collection("notifications").insertOne({
    id: uuidv4(),
    type,
    title,
    message,
    link: null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

async function syncMediaUsage(db, blog) {
  const urls = new Set();
  if (blog.featuredImage && blog.featuredImage.url)
    urls.add(blog.featuredImage.url);
  for (const m of blog.contentHtml
    ? blog.contentHtml.match(/src=["']([^"']+)["']/g) || []
    : []) {
    const u = m.match(/src=["']([^"']+)["']/);
    if (u) urls.add(u[1]);
  }
  await db
    .collection("media")
    .updateMany(
      { "usedIn.blogId": blog.id },
      { $pull: { usedIn: { blogId: blog.id } } },
    );
  if (urls.size) {
    await db
      .collection("media")
      .updateMany(
        { url: { $in: [...urls] } },
        { $addToSet: { usedIn: { blogId: blog.id, title: blog.title } } },
      );
  }
}

const TRANSITIONS = {
  draft: {
    in_review: { perm: "blogs.edit", label: "submitted for review" },
    published: { perm: "blogs.publish", label: "published" },
  },
  in_review: {
    approved: { perm: "blogs.publish", label: "approved" },
    draft: { perm: "blogs.edit", label: "sent back to draft" },
    published: { perm: "blogs.publish", label: "published" },
  },
  approved: {
    scheduled: { perm: "blogs.schedule", label: "scheduled" },
    in_review: { perm: "blogs.edit", label: "sent back to review" },
    published: { perm: "blogs.publish", label: "published" },
  },
  scheduled: {
    published: { perm: "blogs.publish", label: "published" },
    draft: { perm: "blogs.edit", label: "cancelled schedule" },
  },
  published: { archived: { perm: "blogs.archive", label: "archived" } },
  archived: {
    draft: { perm: "blogs.edit", label: "moved to draft" },
    published: { perm: "blogs.publish", label: "republished" },
  },
};

function newBlogDoc(body, user) {
  const title = body.title || "Untitled draft";
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title,
    slug: body.slug || slugify(title),
    category: body.category || "",
    subcategory: body.subcategory || "",
    tags: body.tags || [],
    author: body.author || user.name,
    authorId: user.id,
    excerpt: body.excerpt || "",
    featuredImage: body.featuredImage || {
      url: "",
      alt: "",
      title: "",
      caption: "",
    },
    contentHtml: body.contentHtml || "",
    wordCount: 0,
    status: "draft",
    scheduledAt: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    seo: Object.assign(
      {
        score: 0,
        metaTitle: "",
        metaDescription: "",
        canonical: "",
        robots: { index: true, follow: true },
        focusKeyword: "",
        secondaryKeywords: [],
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        twitterTitle: "",
        twitterDescription: "",
        twitterImage: "",
      },
      body.seo || {},
    ),
    analytics: {
      views: 0,
      organic: 0,
      avgTime: 0,
      bounce: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
    },
    brief: body.brief || {
      targetKeyword: "",
      intent: "Informational",
      audience: "",
      contentType: "Guide",
      wordCount: 1200,
      competitorUrls: [],
      secondary: [],
      questions: [],
      requiredHeadings: [],
      internalLinks: [],
      externalRefs: [],
    },
    savedSuggestions: [],
  };
}

async function publishingSettings(db) {
  return (
    (await db.collection("settings").findOne({ id: "app-settings" })) || {
      publishing: {},
    }
  );
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params;
  const route = "/" + path.join("/");
  const method = request.method;
  let db;
  try {
    db = await getDb();
    await ensureSeeded(db);
  } catch (e) {
    console.error("DB connection error:", e);
    return handleCORS(
      NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 },
      ),
    );
  }

  if (route === "/auth/login" && method === "POST") {
    try {
      const body = await request.json();
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const member = await db.collection("team").findOne({ email });
      if (
        !member ||
        member.status !== "active" ||
        !verifyPassword(password, member.passwordHash)
      ) {
        return handleCORS(
          NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 },
          ),
        );
      }
      const response = NextResponse.json({
        user: clean({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          status: member.status,
        }),
      });
      response.headers.set(
        "Set-Cookie",
        sessionCookie(createSession(member.id)),
      );
      return handleCORS(response);
    } catch (error) {
      return handleCORS(
        NextResponse.json(
          { error: error.message || "Login failed" },
          { status: 500 },
        ),
      );
    }
  }

  if (route === "/auth/logout" && method === "POST") {
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", clearSessionCookie());
    return handleCORS(response);
  }

  if (route === "/auth/me" && method === "GET") {
    const userId = getSessionUserId(request);
    const member = userId
      ? await db.collection("team").findOne({ id: userId })
      : null;
    if (!member || member.status !== "active")
      return handleCORS(
        NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      );
    return handleCORS(
      NextResponse.json({
        user: clean({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          status: member.status,
        }),
      }),
    );
  }

  if (route === "/health" && method === "GET") {
    return handleCORS(
      NextResponse.json({
        ok: true,
        service: "seo-studio-api",
        time: new Date().toISOString(),
      }),
    );
  }

  try {
    const user = await getUser(request, db);
    if (!user)
      return handleCORS(
        NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      );
    const perms = await getPerms(db, user);
    const can = (key) => perms.includes("*") || perms.includes(key);
    const recordActivity = (...args) => logActivity(db, user, ...args, request);
    const requiredReadPermission = readPermission(route, method, path);
    if (requiredReadPermission && !can(requiredReadPermission)) {
      return forbidden("Your role cannot access this resource.");
    }

    // ---------- SEED (force re-seed) ----------
    if (route === "/seed" && method === "POST") {
      globalThis.__seoStudioSeeded = false;
      await db.collection("blogs").deleteMany({});
      await db.collection("media").deleteMany({});
      await db.collection("keywords").deleteMany({});
      await db.collection("team").deleteMany({});
      await db.collection("roles").deleteMany({});
      await db.collection("activity").deleteMany({});
      await db.collection("notifications").deleteMany({});
      await db.collection("analytics_daily").deleteMany({});
      await db.collection("settings").deleteMany({});
      await ensureSeeded(db);
      return handleCORS(
        NextResponse.json({
          ok: true,
          message: "Workspace re-seeded with sample data",
        }),
      );
    }

    // ---------- STATS ----------
    if (route === "/stats" && method === "GET") {
      if (process.env.GA4_PROPERTY_ID && process.env.GSC_SITE_URL) {
        try {
          const live = await getGoogleAnalytics(30);
          const contentBlogs = await db
            .collection("blogs")
            .find({}, { projection: { status: 1, "seo.score": 1 } })
            .toArray();
          const contentStatus = {
            draft: 0,
            in_review: 0,
            approved: 0,
            scheduled: 0,
            published: 0,
            archived: 0,
          };
          contentBlogs.forEach((blog) => {
            if (contentStatus[blog.status] !== undefined)
              contentStatus[blog.status] += 1;
          });
          const contentScore = contentBlogs.length
            ? Math.round(
                contentBlogs.reduce(
                  (sum, blog) => sum + (blog.seo?.score || 0),
                  0,
                ) / contentBlogs.length,
              )
            : 0;
          const liveRanking = live.topKeywords.filter(
            (keyword) => keyword.position > 0 && keyword.position <= 10,
          ).length;
          return handleCORS(
            NextResponse.json(
              clean({
                kpis: {
                  totalBlogs: { value: contentBlogs.length, delta: 0 },
                  published: { value: contentStatus.published, delta: 0 },
                  drafts: {
                    value: contentStatus.draft + contentStatus.in_review,
                    delta: 0,
                  },
                  scheduled: { value: contentStatus.scheduled, delta: 0 },
                  organicTraffic: {
                    value: live.totals.organic,
                    delta: live.deltas.organic,
                  },
                  seoScore: { value: contentScore, delta: 0 },
                  keywordsRanking: { value: liveRanking, delta: 0 },
                  totalViews: {
                    value: live.totals.views,
                    delta: live.deltas.views,
                  },
                },
                statusCounts: contentStatus,
                spark: {
                  traffic: live.series.map((row) => row.organic),
                  views: live.series.map((row) => row.views),
                  score: [],
                  keywords: live.topKeywords.map((keyword) =>
                    Math.max(0, 100 - keyword.position * 4),
                  ),
                  engagement: live.series.map((row) => row.engagement),
                },
                source: "google",
              }),
            ),
          );
        } catch (error) {
          console.error("Google stats error:", error);
          return handleCORS(
            NextResponse.json(
              { error: error.message || "Google analytics request failed" },
              { status: 502 },
            ),
          );
        }
      }
      const statusCounts = {
        draft: 0,
        in_review: 0,
        approved: 0,
        scheduled: 0,
        published: 0,
        archived: 0,
      };
      const blogs = await db
        .collection("blogs")
        .find(
          {},
          { projection: { status: 1, "seo.score": 1, "analytics.views": 1 } },
        )
        .toArray();
      blogs.forEach((b) => {
        if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
      });
      const totalBlogs = blogs.length;
      const avgSeo = totalBlogs
        ? Math.round(
            blogs.reduce((a, b) => a + ((b.seo && b.seo.score) || 0), 0) /
              totalBlogs,
          )
        : 0;
      const totalViews = blogs.reduce(
        (a, b) => a + ((b.analytics && b.analytics.views) || 0),
        0,
      );
      const kws = await db
        .collection("keywords")
        .find(
          {},
          { projection: { position: 1, previousPosition: 1, volume: 1 } },
        )
        .toArray();
      const ranking = kws.filter((k) => k.position <= 10).length;
      const daily = await db
        .collection("analytics_daily")
        .find(
          {},
          {
            projection: {
              date: 1,
              organic: 1,
              views: 1,
              engagement: 1,
              conversions: 1,
            },
          },
        )
        .sort({ date: -1 })
        .limit(60)
        .toArray();
      const cur = daily.slice(0, 30),
        prev = daily.slice(30, 60);
      const sum = (arr, k) => arr.reduce((a, d) => a + (d[k] || 0), 0);
      const trafficCur = sum(cur, "organic"),
        trafficPrev = sum(prev, "organic");
      const viewsCur = sum(cur, "views"),
        viewsPrev = sum(prev, "views");
      const spark = (arr, k, n) =>
        arr
          .slice(0, n)
          .reverse()
          .map((d) => d[k] || 0);
      const kwSpark = kws
        .slice(0, 8)
        .map((k) => Math.max(0, 100 - k.position * 4));
      const scoreSpark = Array.from({ length: 8 }, () => avgSeo);
      return handleCORS(
        NextResponse.json(
          clean({
            kpis: {
              totalBlogs: {
                value: totalBlogs,
                delta: 0,
              },
              published: { value: statusCounts.published, delta: 0 },
              drafts: {
                value: statusCounts.draft + statusCounts.in_review,
                delta: 0,
              },
              scheduled: { value: statusCounts.scheduled, delta: 0 },
              organicTraffic: {
                value: trafficCur,
                delta: pct(trafficCur, trafficPrev),
              },
              seoScore: { value: avgSeo, delta: 0 },
              keywordsRanking: {
                value: ranking,
                delta: 0,
              },
              totalViews: { value: viewsCur, delta: pct(viewsCur, viewsPrev) },
            },
            statusCounts,
            spark: {
              traffic: spark(daily, "organic", 14),
              views: spark(daily, "views", 14),
              score: scoreSpark,
              keywords: kwSpark,
              engagement: spark(daily, "engagement", 14),
            },
          }),
        ),
      );
    }

    function pct(cur, prev) {
      if (!prev) return cur ? 100 : 0;
      return +(((cur - prev) / Math.abs(prev)) * 100).toFixed(1);
    }

    // ---------- BLOGS ----------
    if (route === "/blogs" && method === "GET") {
      const sp = new URL(request.url).searchParams;
      const q = sp.get("q") || "";
      const status = sp.get("status") || "all";
      const filter = {};
      if (status && status !== "all") {
        const list = status
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (list.length === 1) filter.status = list[0];
        else if (list.length > 1) filter.status = { $in: list };
      }
      if (q) filter.title = { $regex: esc(q), $options: "i" };
      if (sp.get("author")) filter.author = sp.get("author");
      if (sp.get("category")) filter.category = sp.get("category");
      if (sp.get("keyword"))
        filter["seo.focusKeyword"] = {
          $regex: esc(sp.get("keyword")),
          $options: "i",
        };
      if (sp.get("seoBand")) {
        const band = sp.get("seoBand");
        if (band === "high") filter["seo.score"] = { $gte: 80 };
        else if (band === "mid") filter["seo.score"] = { $gte: 60, $lt: 80 };
        else if (band === "low") filter["seo.score"] = { $lt: 60 };
      }
      const sortMap = {
        newest: { updatedAt: -1 },
        oldest: { updatedAt: 1 },
        views: { "analytics.views": -1 },
        seo_high: { "seo.score": -1 },
        seo_low: { "seo.score": 1 },
        alpha: { title: 1 },
      };
      const sort = sortMap[sp.get("sort")] || sortMap.newest;
      const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
      const limit = Math.min(parseInt(sp.get("limit") || "10", 10), 100);
      const total = await db.collection("blogs").countDocuments(filter);
      const items = await db
        .collection("blogs")
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      const countsAgg = await db
        .collection("blogs")
        .aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
        .toArray();
      const counts = {
        all: 0,
        draft: 0,
        in_review: 0,
        approved: 0,
        scheduled: 0,
        published: 0,
        archived: 0,
      };
      countsAgg.forEach((c) => {
        counts[c._id] = c.n;
        counts.all += c.n;
      });
      return handleCORS(
        NextResponse.json(
          clean({
            items,
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            counts,
          }),
        ),
      );
    }

    if (route === "/blogs" && method === "POST") {
      if (!can("blogs.create"))
        return forbidden("Your role cannot create blogs.");
      const body = await request.json();
      const doc = newBlogDoc(body, user);
      const settings = await publishingSettings(db);
      const defaultStatus = settings.publishing?.defaultStatus;
      if (defaultStatus === "draft" || defaultStatus === "in_review")
        doc.status = defaultStatus;
      const a = analyzeSeo(doc);
      doc.seo.score = a.score;
      doc.wordCount = a.stats.words;
      await db.collection("blogs").insertOne(doc);
      await syncMediaUsage(db, doc);
      await recordActivity("created", "blog", doc.title);
      return handleCORS(NextResponse.json(clean(doc), { status: 201 }));
    }

    if (path[0] === "blogs" && path[2] === "duplicate" && method === "POST") {
      if (!can("blogs.create"))
        return forbidden("Your role cannot create blogs.");
      const src = await db.collection("blogs").findOne({ id: path[1] });
      if (!src)
        return handleCORS(
          NextResponse.json({ error: "Blog not found" }, { status: 404 }),
        );
      const copy = {
        ...src,
        id: uuidv4(),
        title: src.title + " (Copy)",
        slug: src.slug + "-copy-" + uuidv4().slice(0, 4),
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analytics: {
          views: 0,
          organic: 0,
          avgTime: 0,
          bounce: 0,
          conversions: 0,
          impressions: 0,
          clicks: 0,
        },
      };
      await db.collection("blogs").insertOne(copy);
      await recordActivity("duplicated", "blog", copy.title);
      return handleCORS(NextResponse.json(clean(copy), { status: 201 }));
    }

    if (path[0] === "blogs" && path[2] === "transition" && method === "POST") {
      const blog = await db.collection("blogs").findOne({ id: path[1] });
      if (!blog)
        return handleCORS(
          NextResponse.json({ error: "Blog not found" }, { status: 404 }),
        );
      const body = await request.json();
      const to = body.to;
      const rule = (TRANSITIONS[blog.status] || {})[to];
      if (!rule)
        return handleCORS(
          NextResponse.json(
            { error: "Cannot move a " + blog.status + " blog to " + to },
            { status: 400 },
          ),
        );
      if (!can(rule.perm))
        return forbidden(
          "Your role (" +
            user.role +
            ") is not allowed to " +
            rule.label +
            " blogs.",
        );
      const settings = await publishingSettings(db);
      const publishing = settings.publishing || {};
      if (
        to === "published" &&
        publishing.requireApproval &&
        blog.status !== "approved"
      )
        return handleCORS(
          NextResponse.json(
            { error: "This blog must be approved before publishing." },
            { status: 400 },
          ),
        );
      if (to === "published" && publishing.checklistEnabled) {
        const checklist = [
          blog.seo?.metaTitle,
          blog.seo?.metaDescription,
          blog.seo?.focusKeyword,
          blog.featuredImage?.url,
          blog.featuredImage?.alt,
          /<h1[\s>]/i.test(blog.contentHtml || ""),
        ];
        if (checklist.some((item) => !item))
          return handleCORS(
            NextResponse.json(
              { error: "Complete the publish checklist before publishing." },
              { status: 400 },
            ),
          );
      }
      const update = { status: to, updatedAt: new Date().toISOString() };
      if (to === "published") update.publishedAt = new Date().toISOString();
      if (to === "scheduled" && body.scheduledAt)
        update.scheduledAt = body.scheduledAt;
      if (to === "draft") update.scheduledAt = null;
      await db.collection("blogs").updateOne({ id: blog.id }, { $set: update });
      const updated = { ...blog, ...update };
      await recordActivity(
        "changed_status",
        "blog",
        blog.title + " — " + rule.label,
      );
      if (to === "published")
        await notify(
          db,
          "publish",
          "Blog published successfully",
          '"' + blog.title + '" is now live on the website.',
        );
      if (to === "scheduled")
        await notify(
          db,
          "schedule",
          "Blog scheduled",
          '"' +
            blog.title +
            '" will publish automatically on ' +
            (body.scheduledAt
              ? new Date(body.scheduledAt).toDateString()
              : "the scheduled date") +
            ".",
        );
      if (to === "in_review")
        await notify(
          db,
          "review",
          "Blog requires SEO review",
          '"' + blog.title + '" was submitted for review by ' + user.name + ".",
        );
      return handleCORS(NextResponse.json(clean(updated)));
    }

    if (path[0] === "blogs" && path[1] && path.length === 2) {
      const id = path[1];
      if (method === "GET") {
        const blog = await db.collection("blogs").findOne({ id });
        if (!blog)
          return handleCORS(
            NextResponse.json({ error: "Blog not found" }, { status: 404 }),
          );
        return handleCORS(NextResponse.json(clean(blog)));
      }
      if (method === "PUT") {
        if (!can("blogs.edit"))
          return forbidden("Your role cannot edit blogs.");
        const existing = await db.collection("blogs").findOne({ id });
        if (!existing)
          return handleCORS(
            NextResponse.json({ error: "Blog not found" }, { status: 404 }),
          );
        const body = await request.json();
        const update = { updatedAt: new Date().toISOString() };
        const fields = [
          "title",
          "slug",
          "category",
          "subcategory",
          "tags",
          "author",
          "excerpt",
          "featuredImage",
          "contentHtml",
          "status",
          "seo",
          "brief",
          "savedSuggestions",
          "scheduledAt",
        ];
        fields.forEach((f) => {
          if (body[f] !== undefined) update[f] = body[f];
        });
        const merged = { ...existing, ...update };
        const a = analyzeSeo(merged);
        update["seo.score"] = a.score;
        update.wordCount = a.stats.words;
        await db.collection("blogs").updateOne({ id }, { $set: update });
        await syncMediaUsage(db, {
          ...merged,
          seo: { ...merged.seo, score: a.score },
        });
        return handleCORS(
          NextResponse.json(
            clean({
              ...merged,
              seo: { ...merged.seo, score: a.score },
              wordCount: a.stats.words,
            }),
          ),
        );
      }
      if (method === "DELETE") {
        if (!can("blogs.delete"))
          return forbidden("Your role cannot delete blogs.");
        const existing = await db.collection("blogs").findOne({ id });
        if (!existing)
          return handleCORS(
            NextResponse.json({ error: "Blog not found" }, { status: 404 }),
          );
        await db.collection("blogs").deleteOne({ id });
        await db
          .collection("media")
          .updateMany(
            { "usedIn.blogId": id },
            { $pull: { usedIn: { blogId: id } } },
          );
        await recordActivity("deleted", "blog", existing.title, "", "success");
        return handleCORS(NextResponse.json({ ok: true }));
      }
    }

    // ---------- MEDIA ----------
    if (route === "/media" && method === "GET") {
      const sp = new URL(request.url).searchParams;
      const filter = {};
      if (sp.get("q"))
        filter.$or = [
          { name: { $regex: esc(sp.get("q")), $options: "i" } },
          { alt: { $regex: esc(sp.get("q")), $options: "i" } },
        ];
      if (sp.get("folder")) filter.folder = sp.get("folder");
      if (sp.get("type") && sp.get("type") !== "all")
        filter.type = sp.get("type");
      const items = await db
        .collection("media")
        .find(filter)
        .sort({ uploadedAt: -1 })
        .toArray();
      return handleCORS(NextResponse.json(clean(items)));
    }

    if (route === "/media" && method === "POST") {
      if (!can("media.upload"))
        return forbidden("Your role cannot upload media.");
      const body = await request.json();
      const doc = {
        id: uuidv4(),
        name: body.name || "image.webp",
        url: body.url,
        publicId: body.publicId || "",
        storage: body.storage || "external",
        type: body.type || "image",
        folder: body.folder || "Blog Images",
        size: body.size || 0,
        dimensions: body.dimensions || { width: 0, height: 0 },
        format: body.format || "",
        alt: body.alt || "",
        title: body.title || "",
        caption: body.caption || "",
        description: body.description || "",
        uploadedBy: user.name,
        uploadedAt: new Date().toISOString(),
        usedIn: [],
        compressed: !!body.compressed,
      };
      await db.collection("media").insertOne(doc);
      await recordActivity("uploaded", "media", doc.name);
      return handleCORS(NextResponse.json(clean(doc), { status: 201 }));
    }

    if (path[0] === "media" && path[1] && path.length === 2) {
      const id = path[1];
      if (method === "PUT") {
        if (!can("media.edit"))
          return forbidden("Your role cannot edit media.");
        const body = await request.json();
        const fields = [
          "name",
          "url",
          "folder",
          "size",
          "dimensions",
          "format",
          "alt",
          "title",
          "caption",
          "description",
          "compressed",
          "type",
          "publicId",
          "storage",
        ];
        const update = {};
        fields.forEach((f) => {
          if (body[f] !== undefined) update[f] = body[f];
        });
        const existing = await db.collection("media").findOne({ id });
        if (body.url && existing?.publicId && body.url !== existing.url) {
          try {
            await deleteAsset(
              existing.publicId,
              existing.type === "video" ? "video" : "image",
            );
          } catch (error) {}
        }
        await db.collection("media").updateOne({ id }, { $set: update });
        const doc = await db.collection("media").findOne({ id });
        await recordActivity("updated", "media", (doc && doc.name) || id);
        return handleCORS(NextResponse.json(clean(doc)));
      }
      if (method === "DELETE") {
        if (!can("media.delete"))
          return forbidden("Your role cannot delete media.");
        const doc = await db.collection("media").findOne({ id });
        if (doc && doc.url && doc.url.startsWith("/uploads/")) {
          try {
            await fs.unlink(path.join(process.cwd(), "public", doc.url));
          } catch (e) {}
        }
        if (doc?.publicId) {
          try {
            await deleteAsset(
              doc.publicId,
              doc.type === "video" ? "video" : "image",
            );
          } catch (error) {}
        }
        await db.collection("media").deleteOne({ id });
        await recordActivity("deleted", "media", (doc && doc.name) || id);
        return handleCORS(NextResponse.json({ ok: true }));
      }
    }

    // ---------- UPLOAD (multipart) ----------
    if (route === "/upload" && method === "POST") {
      if (!can("media.upload"))
        return forbidden("Your role cannot upload media.");
      const form = await request.formData();
      const files = form.getAll("files");
      if (!files.length)
        return handleCORS(
          NextResponse.json(
            { error: "At least one file is required" },
            { status: 400 },
          ),
        );
      const folder = form.get("folder") || "Blog Images";
      const created = [];
      try {
        for (const file of files) {
          const buf = Buffer.from(await file.arrayBuffer());
          const result = await uploadBuffer(buf, file.name, folder);
          const mime = file.type || "";
          const format = (
            result.format ||
            file.name.split(".").pop() ||
            "bin"
          ).toUpperCase();
          const doc = {
            id: uuidv4(),
            name: file.name,
            url: result.secure_url,
            publicId: result.public_id,
            storage: "cloudinary",
            type: mime.startsWith("video")
              ? "video"
              : mime.startsWith("image")
                ? "image"
                : "document",
            folder,
            size: result.bytes || buf.length,
            dimensions: {
              width: result.width || 0,
              height: result.height || 0,
            },
            format,
            alt: form.get("alt") || "",
            title: form.get("title") || "",
            caption: "",
            description: "",
            uploadedBy: user.name,
            uploadedAt: new Date().toISOString(),
            usedIn: [],
            compressed: format === "WEBP",
          };
          await db.collection("media").insertOne(doc);
          created.push(doc);
          await recordActivity("uploaded", "media", file.name);
        }
      } catch (error) {
        return handleCORS(
          NextResponse.json(
            { error: error.message || "Cloudinary upload failed" },
            { status: error.message?.includes("not configured") ? 503 : 502 },
          ),
        );
      }
      return handleCORS(NextResponse.json(clean(created), { status: 201 }));
    }

    // ---------- KEYWORDS ----------
    if (route === "/keywords" && method === "GET") {
      const sp = new URL(request.url).searchParams;
      const filter = {};
      if (sp.get("q"))
        filter.keyword = { $regex: esc(sp.get("q")), $options: "i" };
      const items = await db
        .collection("keywords")
        .find(filter)
        .sort({ volume: -1 })
        .toArray();
      return handleCORS(NextResponse.json(clean(items)));
    }

    if (route === "/keywords" && method === "POST") {
      if (!can("seo.keywords"))
        return forbidden("Your role cannot manage keywords.");
      const body = await request.json();
      const kw = String(body.keyword || "").trim();
      if (!kw)
        return handleCORS(
          NextResponse.json({ error: "Keyword is required" }, { status: 400 }),
        );
      const vol =
        parseInt(body.volume || "0", 10) ||
        Math.max(300, (kw.length * 137) % 9000);
      const diff =
        parseInt(body.difficulty || "0", 10) ||
        Math.max(15, (kw.length * 53) % 90);
      const pos =
        parseInt(body.position || "0", 10) ||
        Math.max(3, (kw.length * 29) % 40);
      const doc = {
        id: uuidv4(),
        keyword: kw,
        volume: vol,
        difficulty: diff,
        position: pos,
        previousPosition: pos + 1,
        trend: Array.from({ length: 10 }, (_, j) =>
          Math.max(1, Math.round(pos + Math.sin(j / 2) * 2)),
        ),
        history: Array.from({ length: 12 }, (_, j) => ({
          month: j,
          position: Math.max(1, pos + Math.round(Math.sin(j) * 2) + 2),
        })),
        targetUrl: body.targetUrl || "",
        targetBlog: body.targetBlog || "",
        status: pos <= 3 ? "top3" : pos <= 10 ? "improving" : "needs-attention",
        country: body.country || "Global",
        intent: body.intent || "Informational",
        serpFeatures: body.serpFeatures || ["People Also Ask"],
        related: body.related || [kw + " guide", kw + " tools", "best " + kw],
        createdAt: new Date().toISOString(),
      };
      await db.collection("keywords").insertOne(doc);
      await recordActivity("created", "keyword", kw);
      return handleCORS(NextResponse.json(clean(doc), { status: 201 }));
    }

    if (route === "/keywords/import" && method === "POST") {
      if (!can("seo.keywords"))
        return forbidden("Your role cannot manage keywords.");
      const body = await request.json();
      const lines = String(body.csv || "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const docs = [];
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim());
        if (!cols[0] || /^keyword$/i.test(cols[0])) continue;
        const kw = cols[0];
        const vol = parseInt(cols[1], 10) || 1000;
        const diff = parseInt(cols[2], 10) || 50;
        const pos = parseInt(cols[3], 10) || 20;
        docs.push({
          id: uuidv4(),
          keyword: kw,
          volume: vol,
          difficulty: diff,
          position: pos,
          previousPosition: pos + 1,
          trend: Array.from({ length: 10 }, (_, j) =>
            Math.max(1, Math.round(pos + Math.sin(j / 2) * 2)),
          ),
          history: Array.from({ length: 12 }, (_, j) => ({
            month: j,
            position: Math.max(1, pos + 2),
          })),
          targetUrl: cols[4] || "",
          targetBlog: "",
          status:
            pos <= 3 ? "top3" : pos <= 10 ? "improving" : "needs-attention",
          country: "Global",
          intent: "Informational",
          serpFeatures: [],
          related: [],
          createdAt: new Date().toISOString(),
        });
      }
      if (docs.length) await db.collection("keywords").insertMany(docs);
      await recordActivity(
        "imported",
        "keyword",
        docs.length + " keywords via CSV",
      );
      return handleCORS(NextResponse.json({ imported: docs.length }));
    }

    if (path[0] === "keywords" && path[1] && path.length === 2) {
      const id = path[1];
      if (method === "PUT") {
        if (!can("seo.keywords"))
          return forbidden("Your role cannot manage keywords.");
        const body = await request.json();
        const fields = [
          "keyword",
          "volume",
          "difficulty",
          "position",
          "previousPosition",
          "targetUrl",
          "targetBlog",
          "status",
          "country",
          "intent",
          "related",
          "serpFeatures",
        ];
        const update = {};
        fields.forEach((f) => {
          if (body[f] !== undefined) update[f] = body[f];
        });
        if (update.position !== undefined)
          update.status =
            update.position <= 3
              ? "top3"
              : update.position <= 10
                ? "improving"
                : "needs-attention";
        await db.collection("keywords").updateOne({ id }, { $set: update });
        const doc = await db.collection("keywords").findOne({ id });
        await recordActivity("updated", "keyword", (doc && doc.keyword) || id);
        return handleCORS(NextResponse.json(clean(doc)));
      }
      if (method === "DELETE") {
        if (!can("seo.keywords"))
          return forbidden("Your role cannot manage keywords.");
        const doc = await db.collection("keywords").findOne({ id });
        await db.collection("keywords").deleteOne({ id });
        await recordActivity("deleted", "keyword", (doc && doc.keyword) || id);
        return handleCORS(NextResponse.json({ ok: true }));
      }
    }

    // ---------- TEAM ----------
    if (route === "/team" && method === "GET") {
      const items = await db
        .collection("team")
        .find({})
        .sort({ name: 1 })
        .toArray();
      return handleCORS(NextResponse.json(clean(items.map(publicMember))));
    }

    if (route === "/team" && method === "POST") {
      if (!can("team.invite"))
        return forbidden("Your role cannot invite users.");
      const body = await request.json();
      if (!body.name || !body.email)
        return handleCORS(
          NextResponse.json(
            { error: "Name and email are required" },
            { status: 400 },
          ),
        );
      if (!body.password || String(body.password).length < 8)
        return handleCORS(
          NextResponse.json(
            { error: "A password of at least 8 characters is required" },
            { status: 400 },
          ),
        );
      const exists = await db.collection("team").findOne({ email: body.email });
      if (exists)
        return handleCORS(
          NextResponse.json(
            { error: "A member with this email already exists" },
            { status: 400 },
          ),
        );
      const doc = {
        id: uuidv4(),
        name: body.name,
        email: body.email,
        role: body.role || "Viewer",
        department: body.department || "Content",
        status: "active",
        blogsCreated: 0,
        blogsPublished: 0,
        lastActive: "Just joined",
        joinedAt: new Date().toISOString().slice(0, 10),
        permissions: [],
        passwordHash: hashPassword(String(body.password)),
      };
      await db.collection("team").insertOne(doc);
      await recordActivity("invited", "user", body.email + " as " + doc.role);
      await notify(
        db,
        "team",
        "New team member invited",
        body.name + " was invited as " + doc.role + ".",
      );
      return handleCORS(
        NextResponse.json(clean(publicMember(doc)), { status: 201 }),
      );
    }

    if (path[0] === "team" && path[1] && path.length === 2) {
      const id = path[1];
      if (method === "PUT") {
        if (!can("team.edit"))
          return forbidden("Your role cannot edit team members.");
        const body = await request.json();
        const fields = ["name", "email", "role", "department", "status"];
        const update = {};
        fields.forEach((f) => {
          if (body[f] !== undefined) update[f] = body[f];
        });
        if (body.password) {
          if (String(body.password).length < 8)
            return handleCORS(
              NextResponse.json(
                { error: "A password must be at least 8 characters" },
                { status: 400 },
              ),
            );
          update.passwordHash = hashPassword(String(body.password));
        }
        await db.collection("team").updateOne({ id }, { $set: update });
        const doc = await db.collection("team").findOne({ id });
        await recordActivity("updated", "user", (doc && doc.name) || id);
        return handleCORS(NextResponse.json(clean(publicMember(doc))));
      }
      if (method === "DELETE") {
        if (!can("team.delete"))
          return forbidden("Your role cannot remove team members.");
        const doc = await db.collection("team").findOne({ id });
        await db.collection("team").deleteOne({ id });
        await recordActivity("removed", "user", (doc && doc.name) || id);
        return handleCORS(NextResponse.json({ ok: true }));
      }
    }

    // ---------- ROLES ----------
    if (route === "/roles" && method === "GET") {
      const items = await db
        .collection("roles")
        .find({})
        .sort({ isCustom: 1, name: 1 })
        .toArray();
      return handleCORS(NextResponse.json(clean(items)));
    }

    if (route === "/permissions" && method === "GET") {
      const catalog = await db
        .collection("permission_catalog")
        .findOne({ id: "default" });
      return handleCORS(NextResponse.json(clean(catalog?.groups || [])));
    }

    if (route === "/team-options" && method === "GET") {
      const options = await db
        .collection("workspace_config")
        .findOne({ id: "default" }, { projection: { departments: 1 } });
      return handleCORS(
        NextResponse.json(clean(options || { departments: [] })),
      );
    }

    if (route === "/settings-options" && method === "GET") {
      const options = await db
        .collection("workspace_config")
        .findOne(
          { id: "default" },
          { projection: { timezones: 1, languages: 1, defaultStatuses: 1 } },
        );
      return handleCORS(
        NextResponse.json(
          clean(
            options || { timezones: [], languages: [], defaultStatuses: [] },
          ),
        ),
      );
    }

    if (route === "/content-options" && method === "GET") {
      const options = await db
        .collection("workspace_config")
        .findOne(
          { id: "default" },
          { projection: { categories: 1, subcategories: 1 } },
        );
      return handleCORS(
        NextResponse.json(
          clean(options || { categories: [], subcategories: [] }),
        ),
      );
    }

    if (route === "/roles" && method === "POST") {
      if (!can("team.roles"))
        return forbidden("Your role cannot manage roles.");
      const body = await request.json();
      if (!body.name)
        return handleCORS(
          NextResponse.json(
            { error: "Role name is required" },
            { status: 400 },
          ),
        );
      const doc = {
        id: uuidv4(),
        name: body.name,
        slug: slugify(body.name),
        description: body.description || "Custom role",
        isCustom: true,
        permissions: body.permissions || [],
      };
      await db.collection("roles").insertOne(doc);
      await recordActivity("created", "role", body.name);
      return handleCORS(NextResponse.json(clean(doc), { status: 201 }));
    }

    if (path[0] === "roles" && path[1] && path.length === 2) {
      const id = path[1];
      if (method === "PUT") {
        if (!can("team.roles"))
          return forbidden("Your role cannot manage roles.");
        const body = await request.json();
        const update = {};
        if (body.permissions !== undefined)
          update.permissions = body.permissions;
        if (body.description !== undefined)
          update.description = body.description;
        if (body.name !== undefined) update.name = body.name;
        await db.collection("roles").updateOne({ id }, { $set: update });
        const doc = await db.collection("roles").findOne({ id });
        await recordActivity("updated", "role", (doc && doc.name) || id);
        return handleCORS(NextResponse.json(clean(doc)));
      }
      if (method === "DELETE") {
        if (!can("team.roles"))
          return forbidden("Your role cannot manage roles.");
        const doc = await db.collection("roles").findOne({ id });
        if (doc && !doc.isCustom)
          return handleCORS(
            NextResponse.json(
              { error: "Default roles cannot be deleted" },
              { status: 400 },
            ),
          );
        await db.collection("roles").deleteOne({ id });
        await recordActivity("deleted", "role", (doc && doc.name) || id);
        return handleCORS(NextResponse.json({ ok: true }));
      }
    }

    // ---------- ACTIVITY ----------
    if (route === "/activity" && method === "GET") {
      const sp = new URL(request.url).searchParams;
      const filter = {};
      if (sp.get("user")) filter.user = sp.get("user");
      if (sp.get("action")) filter.action = sp.get("action");
      if (sp.get("resourceType")) filter.resourceType = sp.get("resourceType");
      if (sp.get("q"))
        filter.resource = { $regex: esc(sp.get("q")), $options: "i" };
      const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
      const limit = 15;
      const total = await db.collection("activity").countDocuments(filter);
      const items = await db
        .collection("activity")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      return handleCORS(
        NextResponse.json(
          clean({ items, total, page, pages: Math.ceil(total / limit) || 1 }),
        ),
      );
    }

    // ---------- NOTIFICATIONS ----------
    if (route === "/notifications" && method === "GET") {
      const items = await db
        .collection("notifications")
        .find({})
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();
      return handleCORS(NextResponse.json(clean(items)));
    }

    if (route === "/notifications/read-all" && method === "POST") {
      await db
        .collection("notifications")
        .updateMany({ read: false }, { $set: { read: true } });
      return handleCORS(NextResponse.json({ ok: true }));
    }

    if (path[0] === "notifications" && path[2] === "read" && method === "PUT") {
      await db
        .collection("notifications")
        .updateOne({ id: path[1] }, { $set: { read: true } });
      return handleCORS(NextResponse.json({ ok: true }));
    }

    // ---------- ANALYTICS ----------
    if (route === "/analytics" && method === "GET") {
      const sp = new URL(request.url).searchParams;
      const ranges = { 7: 7, 30: 30, 90: 90, 180: 180, 365: 365 };
      const n = ranges[sp.get("range") || "30"] || 30;
      if (process.env.GA4_PROPERTY_ID && process.env.GSC_SITE_URL) {
        try {
          return handleCORS(
            NextResponse.json(clean(await getGoogleAnalytics(n))),
          );
        } catch (error) {
          console.error("Google analytics error:", error);
          return handleCORS(
            NextResponse.json(
              { error: error.message || "Google analytics request failed" },
              { status: 502 },
            ),
          );
        }
      }
      const daily = await db
        .collection("analytics_daily")
        .find({})
        .sort({ date: -1 })
        .limit(n * 2)
        .toArray();
      const cur = daily.slice(0, n).reverse();
      const prev = daily.slice(n, n * 2).reverse();
      const sum = (arr, k) => arr.reduce((a, d) => a + (d[k] || 0), 0);
      const totals = {
        organic: sum(cur, "organic"),
        views: sum(cur, "views"),
        unique: null,
        engagement: cur.length
          ? Math.round(sum(cur, "engagement") / cur.length)
          : 0,
        conversions: sum(cur, "conversions"),
        impressions: sum(cur, "impressions"),
        clicks: sum(cur, "clicks"),
        avgPosition: cur.length
          ? +(sum(cur, "avgPosition") / cur.length).toFixed(1)
          : 0,
      };
      const prevTotals = {
        organic: sum(prev, "organic"),
        views: sum(prev, "views"),
        engagement: prev.length
          ? Math.round(sum(prev, "engagement") / prev.length)
          : 0,
        conversions: sum(prev, "conversions"),
        impressions: sum(prev, "impressions"),
        clicks: sum(prev, "clicks"),
        avgPosition: prev.length
          ? +(sum(prev, "avgPosition") / prev.length).toFixed(1)
          : 0,
      };
      const pct = (a, b) =>
        b ? +(((a - b) / b) * 100).toFixed(1) : a ? 100 : 0;
      const series = cur.map((d) => ({
        date: d.date,
        organic: d.organic,
        views: d.views,
        engagement: d.engagement,
        conversions: d.conversions,
        impressions: d.impressions,
        position: d.avgPosition,
      }));
      const blogs = await db
        .collection("blogs")
        .find({ status: "published" })
        .sort({ "analytics.views": -1 })
        .limit(8)
        .toArray();
      const kws = await db
        .collection("keywords")
        .find({})
        .sort({ volume: -1 })
        .limit(8)
        .toArray();
      return handleCORS(
        NextResponse.json(
          clean({
            range: n,
            series,
            totals,
            deltas: {
              organic: pct(totals.organic, prevTotals.organic),
              views: pct(totals.views, prevTotals.views),
              engagement: pct(totals.engagement, prevTotals.engagement),
              conversions: pct(totals.conversions, prevTotals.conversions),
              impressions: pct(totals.impressions, prevTotals.impressions),
              ctr: prevTotals.impressions
                ? +(
                    (((totals.clicks / totals.impressions) * 100 -
                      (prevTotals.clicks / prevTotals.impressions) * 100) /
                      ((prevTotals.clicks / prevTotals.impressions) * 100 ||
                        1)) *
                    100
                  ).toFixed(1)
                : 0,
              avgPosition: prevTotals.avgPosition
                ? +(totals.avgPosition - prevTotals.avgPosition).toFixed(1)
                : 0,
            },
            devices: [],
            countries: [],
            topPages: blogs.map((b) => ({
              id: b.id,
              title: b.title,
              slug: b.slug,
              views: b.analytics.views,
              organic: b.analytics.organic,
              ctr: 4.2 + (b.seo.score % 5),
            })),
            topKeywords: kws.map((k) => ({
              keyword: k.keyword,
              position: k.position,
              previousPosition: k.previousPosition,
              volume: k.volume,
              clicks: Math.round(k.volume * 0.28),
              difficulty: k.difficulty,
            })),
            ctr: totals.impressions
              ? +((totals.clicks / totals.impressions) * 100).toFixed(1)
              : 0,
          }),
        ),
      );
    }

    // ---------- SEO ISSUES ----------
    if (route === "/seo-issues" && method === "GET") {
      const blogs = await db
        .collection("blogs")
        .find({ status: { $ne: "archived" } })
        .toArray();
      const allBlogs = await db.collection("blogs").find({}).toArray();
      const media = await db.collection("media").find({}).toArray();
      const issues = [];
      const addIssue = (
        id,
        title,
        severity,
        description,
        affected,
        fixTarget,
      ) => {
        if (affected.length)
          issues.push({
            id,
            title,
            severity,
            description,
            affected,
            fixTarget,
          });
      };
      const noMeta = blogs.filter((b) => !(b.seo && b.seo.metaDescription));
      addIssue(
        "missing-meta-desc",
        "Missing meta description",
        "critical",
        "Pages without a meta description lose click-through opportunities in search results.",
        noMeta,
        "meta",
      );
      const titleMap = {};
      blogs.forEach((b) => {
        const k = ((b.seo && b.seo.metaTitle) || b.title || "")
          .toLowerCase()
          .trim();
        (titleMap[k] = titleMap[k] || []).push(b);
      });
      const dupes = Object.values(titleMap)
        .filter((arr) => arr.length > 1)
        .flat();
      addIssue(
        "duplicate-title",
        "Duplicate title",
        "critical",
        "Multiple pages compete for the same title, splitting ranking signals.",
        dupes,
        "title",
      );
      const longTitle = blogs.filter(
        (b) => ((b.seo && b.seo.metaTitle) || b.title || "").length > 60,
      );
      addIssue(
        "title-too-long",
        "Title too long",
        "warning",
        "Titles over 60 characters get truncated in search snippets.",
        longTitle,
        "title",
      );
      const noH1 = blogs.filter(
        (b) =>
          !/<h1[\s>]/i.test(b.contentHtml || "") &&
          !/<h2[\s>]/i.test(b.contentHtml || ""),
      );
      addIssue(
        "missing-h1",
        "Missing H1 heading",
        "critical",
        "Every page needs exactly one H1 that states the topic.",
        noH1,
        "content",
      );
      const noAlt = blogs.filter((b) => {
        const imgs = (b.contentHtml || "").match(/<img[^>]*>/gi) || [];
        return imgs.some((t) => !/alt\s*=\s*["'][^"']+["']/i.test(t));
      });
      addIssue(
        "missing-alt",
        "Missing image alt text",
        "warning",
        "Images without alt text hurt accessibility and image search visibility.",
        noAlt,
        "content",
      );
      const noInternal = blogs.filter(
        (b) => !(b.contentHtml || "").match(/href\s*=\s*["']\/[^"']*["']/i),
      );
      addIssue(
        "no-internal-links",
        "No internal links",
        "warning",
        "Internal links distribute authority and improve crawlability.",
        noInternal,
        "links",
      );
      const noCanonical = blogs.filter((b) => !(b.seo && b.seo.canonical));
      addIssue(
        "missing-canonical",
        "Missing canonical URL",
        "warning",
        "Canonical URLs prevent duplicate-content confusion.",
        noCanonical,
        "meta",
      );
      const lowKw = blogs.filter(
        (b) => b.seo && b.seo.focusKeyword && b.seo.score < 65,
      );
      addIssue(
        "low-keyword-usage",
        "Low keyword usage",
        "warning",
        "The focus keyword appears too rarely for search engines to associate the page with it.",
        lowKw,
        "seo",
      );
      const bigMedia = media.filter((m) => m.size > 300000);
      addIssue(
        "large-image",
        "Large image size",
        "warning",
        "Images over 300KB slow down page load and hurt Core Web Vitals.",
        bigMedia.map((m) => ({ id: m.id, title: m.name })),
        "media",
      );
      const broken = blogs.filter((b) => {
        const hrefs = [
          ...(b.contentHtml || "").matchAll(
            /href\s*=\s*["'](\/blog\/([^"']*))["']/gi,
          ),
        ];
        return hrefs.some((m) => !allBlogs.some((x) => x.slug === m[2]));
      });
      addIssue(
        "broken-internal-link",
        "Broken internal link",
        "critical",
        "Internal links pointing to pages that do not exist.",
        broken,
        "content",
      );
      let passed = 0;
      blogs.forEach((b) => {
        if (b.seo && b.seo.score >= 80) passed++;
      });
      return handleCORS(
        NextResponse.json(
          clean({
            issues,
            summary: {
              critical: issues
                .filter((i) => i.severity === "critical")
                .reduce((a, i) => a + i.affected.length, 0),
              warnings: issues
                .filter((i) => i.severity === "warning")
                .reduce((a, i) => a + i.affected.length, 0),
              passed,
              audits: blogs.length * 10,
            },
          }),
        ),
      );
    }

    // ---------- GLOBAL SEARCH ----------
    if (route === "/search" && method === "GET") {
      const q = (new URL(request.url).searchParams.get("q") || "").trim();
      if (!q)
        return handleCORS(
          NextResponse.json({
            blogs: [],
            media: [],
            keywords: [],
            users: [],
            categories: [],
          }),
        );
      const rx = { $regex: esc(q), $options: "i" };
      const [blogs, media, keywords, users] = await Promise.all([
        db
          .collection("blogs")
          .find({
            $or: [{ title: rx }, { slug: rx }, { "seo.focusKeyword": rx }],
          })
          .limit(5)
          .toArray(),
        db
          .collection("media")
          .find({ $or: [{ name: rx }, { alt: rx }] })
          .limit(5)
          .toArray(),
        db.collection("keywords").find({ keyword: rx }).limit(5).toArray(),
        db
          .collection("team")
          .find({ $or: [{ name: rx }, { email: rx }] })
          .limit(5)
          .toArray(),
      ]);
      const contentConfig = await db
        .collection("workspace_config")
        .findOne({ id: "default" }, { projection: { categories: 1 } });
      const categories = contentConfig?.categories || [];
      return handleCORS(
        NextResponse.json(
          clean({
            blogs: blogs.map((b) => ({
              id: b.id,
              title: b.title,
              status: b.status,
            })),
            media: media.map((m) => ({ id: m.id, name: m.name, url: m.url })),
            keywords: keywords.map((k) => ({ id: k.id, keyword: k.keyword })),
            users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
            categories: categories.filter((c) =>
              c.toLowerCase().includes(q.toLowerCase()),
            ),
          }),
        ),
      );
    }

    // ---------- CONTENT OUTLINE GENERATOR ----------
    if (route === "/generate-outline" && method === "POST") {
      if (!can("blogs.create"))
        return forbidden("Your role cannot generate blog outlines.");
      const body = await request.json();
      if (!String(body.keyword || "").trim())
        return handleCORS(
          NextResponse.json({ error: "Keyword is required" }, { status: 400 }),
        );
      try {
        return handleCORS(NextResponse.json(await generateOutline(body)));
      } catch (error) {
        return handleCORS(
          NextResponse.json(
            { error: error.message || "Outline generation failed" },
            { status: error.message?.includes("not configured") ? 503 : 502 },
          ),
        );
      }
    }

    // ---------- SETTINGS ----------
    if (route === "/settings" && method === "GET") {
      let s = await db.collection("settings").findOne({ id: "app-settings" });
      if (!s) {
        s = { id: "app-settings", general: {}, seo: {}, publishing: {} };
        await db.collection("settings").insertOne(s);
      }
      return handleCORS(NextResponse.json(clean(s)));
    }

    if (route === "/settings" && method === "PUT") {
      if (!can("settings.edit"))
        return forbidden("Your role cannot edit settings.");
      const body = await request.json();
      const existing = (await db
        .collection("settings")
        .findOne({ id: "app-settings" })) || {
        general: {},
        seo: {},
        publishing: {},
      };
      const merged = {
        general: { ...(existing.general || {}), ...(body.general || {}) },
        seo: { ...(existing.seo || {}), ...(body.seo || {}) },
        publishing: {
          ...(existing.publishing || {}),
          ...(body.publishing || {}),
        },
      };
      await db
        .collection("settings")
        .updateOne({ id: "app-settings" }, { $set: merged }, { upsert: true });
      await recordActivity("updated", "settings", "Workspace settings");
      const s = await db.collection("settings").findOne({ id: "app-settings" });
      return handleCORS(NextResponse.json(clean(s)));
    }

    if (route === "/categories" && method === "GET") {
      const cats = await db.collection("blogs").distinct("category");
      return handleCORS(
        NextResponse.json({ categories: cats.filter(Boolean) }),
      );
    }

    return handleCORS(
      NextResponse.json(
        { error: "Route " + route + " not found" },
        { status: 404 },
      ),
    );
  } catch (error) {
    console.error("API Error [" + method + " " + route + "]:", error);
    return handleCORS(
      NextResponse.json(
        {
          error: "Internal server error",
          detail: String(error.message || error),
        },
        { status: 500 },
      ),
    );
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
