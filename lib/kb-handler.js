import { NextResponse } from "next/server";
import {
  getKbCategories,
  createKbCategory,
  updateKbCategory,
  deleteKbCategory,
  getKbArticles,
  getKbArticleBySlug,
  getKbArticleById,
  createKbArticle,
  updateKbArticle,
  deleteKbArticle,
  recordKbFeedback,
  logFailedKbSearch,
  getKbTemplates,
  createKbTemplate,
  updateKbTemplate,
  deleteKbTemplate,
} from "./kb-db.js";
import {
  translateSingleText,
  translateHtml,
  DEFAULT_TARGET_LANGS,
} from "./blog-translator.js";
import { uploadBuffer } from "./cloudinary.js";

export const singleKbCache = new Map();
const SINGLE_KB_CACHE_TTL = 60000; // 60s auto-expiry

export async function autoUploadBase64InBody(body) {
  if (!body) return;
  if (body.contentHtml && body.contentHtml.includes("data:image/")) {
    const regex = /src=["'](data:image\/(png|jpeg|jpg|webp);base64,([^"']+))["']/g;
    let match;
    const urlMap = new Map();
    while ((match = regex.exec(body.contentHtml)) !== null) {
      const fullDataUri = match[1];
      const ext = match[2];
      const base64Data = match[3];
      if (!urlMap.has(fullDataUri)) {
        try {
          const buf = Buffer.from(base64Data, "base64");
          const filename = `kb-inline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const res = await uploadBuffer(buf, filename, "seo-studio/kb");
          urlMap.set(fullDataUri, res.secure_url);
        } catch (e) {
          console.error("Cloudinary inline image upload failed:", e);
        }
      }
    }
    for (const [dataUri, cdnUrl] of urlMap.entries()) {
      body.contentHtml = body.contentHtml.split(dataUri).join(cdnUrl);
    }
  }

  if (Array.isArray(body.steps)) {
    for (const step of body.steps) {
      if (step?.imageUrl && step.imageUrl.startsWith("data:image/")) {
        try {
          const m = step.imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
          if (m) {
            const ext = m[1];
            const buf = Buffer.from(m[2], "base64");
            const filename = `kb-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
            const res = await uploadBuffer(buf, filename, "seo-studio/kb");
            step.imageUrl = res.secure_url;
          }
        } catch (e) {
          console.error("Cloudinary step image upload failed:", e);
        }
      }
    }
  }
}

export async function sanitizeAllKbArticles(db) {
  try {
    const rawArticles = await db
      .collection("kb_articles")
      .find({
        $or: [
          { contentHtml: { $regex: "data:image/" } },
          { "steps.imageUrl": { $regex: "^data:image/" } },
        ],
      })
      .toArray();
    for (const a of rawArticles) {
      const copy = { contentHtml: a.contentHtml, steps: a.steps };
      await autoUploadBase64InBody(copy);
      await db.collection("kb_articles").updateOne(
        { id: a.id },
        { $set: { contentHtml: copy.contentHtml, steps: copy.steps } },
      );
    }
    if (rawArticles.length > 0) {
      singleKbCache.clear();
    }
  } catch (e) {
    console.error("sanitizeAllKbArticles error:", e);
  }
}

function handleCORS(response, request) {
  const origin = request?.headers?.get("origin");
  if (
    origin &&
    (origin.includes("sharda.co.in") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1"))
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.CORS_ORIGINS || "*",
    );
  }
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

/**
 * Translates a complete Knowledge Base article into specified regional languages
 */
export async function translateKbArticle(
  article,
  targetLangs = DEFAULT_TARGET_LANGS,
) {
  if (!article) return {};
  const existingTranslations = article.translations || {};
  const newTranslations = { ...existingTranslations };

  for (let i = 0; i < targetLangs.length; i += 2) {
    const chunk = targetLangs.slice(i, i + 2);
    await Promise.all(
      chunk.map(async (lang) => {
        try {
          const [transTitle, transOverview, transContentHtml] =
            await Promise.all([
              article.title ? translateSingleText(article.title, lang) : "",
              article.overview
                ? translateSingleText(article.overview, lang)
                : "",
              article.contentHtml
                ? translateHtml(article.contentHtml, lang)
                : "",
            ]);

          // Translate steps
          const transSteps = [];
          if (Array.isArray(article.steps)) {
            for (const step of article.steps) {
              const [stTitle, stInstruction] = await Promise.all([
                step.title ? translateSingleText(step.title, lang) : "",
                step.instruction
                  ? translateSingleText(step.instruction, lang)
                  : "",
              ]);
              transSteps.push({
                stepNumber: step.stepNumber,
                title: stTitle.trim(),
                instruction: stInstruction.trim(),
                imageUrl: step.imageUrl || "",
                callout: step.callout,
              });
            }
          }

          // Translate FAQs
          const transFaqs = [];
          if (Array.isArray(article.faqs)) {
            for (const faq of article.faqs) {
              const [fQ, fA] = await Promise.all([
                faq.question ? translateSingleText(faq.question, lang) : "",
                faq.answer ? translateSingleText(faq.answer, lang) : "",
              ]);
              transFaqs.push({
                question: fQ.trim(),
                answer: fA.trim(),
              });
            }
          }

          newTranslations[lang] = {
            title: transTitle.trim(),
            overview: transOverview.trim(),
            contentHtml: transContentHtml,
            steps: transSteps,
            faqs: transFaqs,
            updatedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`Failed to translate KB article to ${lang}:`, err);
        }
      }),
    );
  }

  return newTranslations;
}

/**
 * Master dispatcher for all /api/kb and /api/public/kb endpoints
 */
export async function handleKbRoute(request, path, method, user, can, db) {
  const isPublic = path[0] === "public";
  const actualPath = isPublic ? path.slice(1) : path; // removes "public"
  // actualPath[0] is "kb"

  try {
    // ----------------------------------------------------
    // 1. CATEGORIES ENDPOINTS
    // ----------------------------------------------------
    // GET /api/public/kb/categories or GET /api/kb/categories
    if (
      actualPath[1] === "categories" &&
      actualPath.length === 2 &&
      method === "GET"
    ) {
      if (
        !isPublic &&
        !can("kb.view") &&
        !can("kb.create") &&
        !can("kb.edit") &&
        !can("kb.categories")
      ) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const categories = await getKbCategories(db, isPublic);
      const res = NextResponse.json({ categories });
      if (isPublic) {
        res.headers.set(
          "Cache-Control",
          "public, s-maxage=120, stale-while-revalidate=600",
        );
      }
      return handleCORS(res, request);
    }

    // POST /api/kb/categories (Admin only)
    if (
      actualPath[1] === "categories" &&
      actualPath.length === 2 &&
      method === "POST"
    ) {
      if (!can("kb.categories")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      const category = await createKbCategory(db, body);
      return handleCORS(
        NextResponse.json({ success: true, category }, { status: 201 }),
        request,
      );
    }

    // PUT /api/kb/categories/[id] (Admin only)
    if (
      actualPath[1] === "categories" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "PUT"
    ) {
      if (!can("kb.categories")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      const category = await updateKbCategory(db, actualPath[2], body);
      return handleCORS(
        NextResponse.json({ success: true, category }),
        request,
      );
    }

    // DELETE /api/kb/categories/[id] (Admin only)
    if (
      actualPath[1] === "categories" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "DELETE"
    ) {
      if (!can("kb.categories")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const result = await deleteKbCategory(db, actualPath[2]);
      return handleCORS(NextResponse.json(result), request);
    }

    // ----------------------------------------------------
    // 2. ARTICLES ENDPOINTS
    // ----------------------------------------------------
    // GET /api/public/kb/articles or GET /api/kb/articles (Listing + Search)
    if (
      actualPath[1] === "articles" &&
      actualPath.length === 2 &&
      method === "GET"
    ) {
      if (
        !isPublic &&
        !can("kb.view") &&
        !can("kb.create") &&
        !can("kb.edit")
      ) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const sp = new URL(request.url).searchParams;
      const q = sp.get("q") || "";
      const categoryId = sp.get("categoryId") || "";
      const categorySlug = sp.get("categorySlug") || "";
      const author = sp.get("author") || "all";
      const status = sp.get("status") || "all";
      const sort = sp.get("sort") || "newest";
      const page = parseInt(sp.get("page") || "1", 10);
      const limit = Math.min(parseInt(sp.get("limit") || "20", 10), 5000);

      const result = await getKbArticles(db, {
        query: q,
        categoryId,
        categorySlug,
        author,
        status,
        sort,
        page,
        limit,
        isPublic,
      });

      // Log failed search if public search returned 0 items
      if (isPublic && q && result.total === 0) {
        logFailedKbSearch(db, q);
      }

      const res = NextResponse.json(result);
      if (isPublic) {
        res.headers.set(
          "Cache-Control",
          "public, s-maxage=120, stale-while-revalidate=600",
        );
      }
      return handleCORS(res, request);
    }

    // GET /api/public/kb/articles/[slug] (Article Reader View by Slug)
    if (
      isPublic &&
      actualPath[1] === "articles" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "GET"
    ) {
      const slug = decodeURIComponent(actualPath[2]);
      const cached = singleKbCache.get(slug);
      if (cached && Date.now() - cached.timestamp < SINGLE_KB_CACHE_TTL) {
        const res = NextResponse.json(cached.data);
        res.headers.set(
          "Cache-Control",
          "public, s-maxage=120, stale-while-revalidate=600",
        );
        return handleCORS(res, request);
      }
      const data = await getKbArticleBySlug(db, slug, true);
      if (!data) {
        return handleCORS(
          NextResponse.json({ error: "Guide not found" }, { status: 404 }),
          request,
        );
      }
      singleKbCache.set(slug, { data, timestamp: Date.now() });
      const res = NextResponse.json(data);
      res.headers.set(
        "Cache-Control",
        "public, s-maxage=120, stale-while-revalidate=600",
      );
      return handleCORS(res, request);
    }

    // GET /api/kb/articles/[id] (Admin Editor View by ID)
    if (
      !isPublic &&
      actualPath[1] === "articles" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "GET"
    ) {
      if (
        !can("kb.view") &&
        !can("kb.edit")
      ) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const article = await getKbArticleById(db, actualPath[2]);
      if (!article) {
        return handleCORS(
          NextResponse.json({ error: "Guide not found" }, { status: 404 }),
          request,
        );
      }
      return handleCORS(NextResponse.json({ article }), request);
    }

    // POST /api/kb/articles (Admin: Create Guide)
    if (
      !isPublic &&
      actualPath[1] === "articles" &&
      actualPath.length === 2 &&
      method === "POST"
    ) {
      if (!can("kb.create")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      await autoUploadBase64InBody(body);
      singleKbCache.clear();
      if (body.status === "published" && !can("kb.publish")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to publish guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "scheduled" && !can("kb.schedule")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to schedule guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "archived" && !can("kb.archive")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to archive guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "published" || body.status === "scheduled") {
        if (!body.categoryId) {
          return handleCORS(
            NextResponse.json(
              { error: "Please select a category before publishing or scheduling" },
              { status: 400 },
            ),
            request,
          );
        }
        const textOnly = (body.contentHtml || "").replace(/<[^>]*>/g, "").trim();
        const hasMedia = body.contentHtml?.includes("<img") || body.contentHtml?.includes("<iframe");
        if (!textOnly && !hasMedia) {
          return handleCORS(
            NextResponse.json(
              { error: "Guide Document Content cannot be empty when publishing or scheduling" },
              { status: 400 },
            ),
            request,
          );
        }
      }
      const article = await createKbArticle(db, body, user);

      // If created as published, trigger async translation in background
      if (article.status === "published") {
        (async () => {
          try {
            const translations = await translateKbArticle(article);
            await updateKbArticle(db, article.id, { translations });
          } catch (e) {
            console.error("Auto-translate KB article failed:", e);
          }
        })();
      }

      return handleCORS(
        NextResponse.json({ success: true, article }, { status: 201 }),
        request,
      );
    }

    // PUT /api/kb/articles/[id] (Admin: Update Guide)
    if (
      !isPublic &&
      actualPath[1] === "articles" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "PUT"
    ) {
      const body = await request.json();
      const canEdit = can("kb.edit");
      const statusPermission = {
        published: can("kb.publish"),
        scheduled: can("kb.schedule"),
        archived: can("kb.archive"),
      };
      const statusOnly =
        body.status &&
        Object.keys(body).every(
          (key) => key === "status" || key === "scheduledAt",
        );
      const hasStatusPermission =
        Object.prototype.hasOwnProperty.call(statusPermission, body.status) &&
        statusPermission[body.status];
      if (!canEdit && !(statusOnly && hasStatusPermission)) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "archived" && !statusPermission.archived) {
        return handleCORS(
          NextResponse.json(
            { error: "Permission denied to archive guides" },
            { status: 403 },
          ),
          request,
        );
      }
      if (body.status === "draft" && !canEdit) {
        return handleCORS(
          NextResponse.json(
            { error: "Permission denied to restore guides to draft" },
            { status: 403 },
          ),
          request,
        );
      }
      await autoUploadBase64InBody(body);
      singleKbCache.clear();
      if (body.status === "published" && !can("kb.publish")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to publish guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "scheduled" && !can("kb.schedule")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to schedule guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "published" || body.status === "scheduled") {
        if (body.categoryId !== undefined && !body.categoryId) {
          return handleCORS(
            NextResponse.json(
              { error: "Please select a category before publishing or scheduling" },
              { status: 400 },
            ),
            request,
          );
        }
        if (body.contentHtml !== undefined) {
          const textOnly = (body.contentHtml || "").replace(/<[^>]*>/g, "").trim();
          const hasMedia = body.contentHtml?.includes("<img") || body.contentHtml?.includes("<iframe");
          if (!textOnly && !hasMedia) {
            return handleCORS(
              NextResponse.json(
                { error: "Guide Document Content cannot be empty when publishing or scheduling" },
                { status: 400 },
              ),
              request,
            );
          }
        }
      }
      const updated = await updateKbArticle(db, actualPath[2], body);

      // If status changed to published or explicitly requested, trigger translation
      if (body.status === "published") {
        (async () => {
          try {
            const translations = await translateKbArticle(updated);
            await updateKbArticle(db, updated.id, { translations });
          } catch (e) {
            console.error("Auto-translate KB article failed:", e);
          }
        })();
      }

      return handleCORS(
        NextResponse.json({ success: true, article: updated }),
        request,
      );
    }

    // DELETE /api/kb/articles/[id] (Admin: Delete Guide)
    if (
      !isPublic &&
      actualPath[1] === "articles" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "DELETE"
    ) {
      if (!can("kb.delete")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const result = await deleteKbArticle(db, actualPath[2]);
      singleKbCache.clear();
      return handleCORS(NextResponse.json(result), request);
    }

    // POST /api/public/kb/articles/[id]/feedback (Feedback: happy, neutral, sad)
    if (
      actualPath[1] === "articles" &&
      actualPath[3] === "feedback" &&
      method === "POST"
    ) {
      const body = await request.json();
      const rating = body.rating;
      const result = await recordKbFeedback(db, actualPath[2], rating);
      return handleCORS(NextResponse.json(result), request);
    }

    // POST /api/kb/articles/[id]/translate (Explicit manual trigger)
    if (
      !isPublic &&
      actualPath[1] === "articles" &&
      actualPath[3] === "translate" &&
      method === "POST"
    ) {
      if (!can("kb.edit")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const article = await getKbArticleById(db, actualPath[2]);
      if (!article) {
        return handleCORS(
          NextResponse.json({ error: "Article not found" }, { status: 404 }),
          request,
        );
      }
      const translations = await translateKbArticle(article);
      await updateKbArticle(db, article.id, { translations });
      return handleCORS(
        NextResponse.json({ success: true, translations }),
        request,
      );
    }

    // ----------------------------------------------------
    // 3. TEMPLATES ENDPOINTS
    // ----------------------------------------------------
    // GET /api/kb/templates
    if (
      !isPublic &&
      actualPath[1] === "templates" &&
      actualPath.length === 2 &&
      method === "GET"
    ) {
      if (
        !can("kb.view") &&
        !can("kb.create") &&
        !can("kb.edit")
      ) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const templates = await getKbTemplates(db);
      return handleCORS(NextResponse.json({ templates }), request);
    }

    // POST /api/kb/templates (Create custom template)
    if (
      !isPublic &&
      actualPath[1] === "templates" &&
      actualPath.length === 2 &&
      method === "POST"
    ) {
      if (!can("kb.create")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      const template = await createKbTemplate(db, body);
      return handleCORS(
        NextResponse.json({ success: true, template }, { status: 201 }),
        request,
      );
    }

    // PUT /api/kb/templates/[id] (Update custom template)
    if (
      !isPublic &&
      actualPath[1] === "templates" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "PUT"
    ) {
      if (!can("kb.edit")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      const template = await updateKbTemplate(db, actualPath[2], body);
      return handleCORS(
        NextResponse.json({ success: true, template }),
        request,
      );
    }

    // DELETE /api/kb/templates/[id] (Delete custom template)
    if (
      !isPublic &&
      actualPath[1] === "templates" &&
      actualPath[2] &&
      actualPath.length === 3 &&
      method === "DELETE"
    ) {
      if (!can("kb.edit")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const result = await deleteKbTemplate(db, actualPath[2]);
      return handleCORS(NextResponse.json(result), request);
    }

    return handleCORS(
      NextResponse.json({ error: "KB route not found" }, { status: 404 }),
      request,
    );
  } catch (err) {
    console.error("KB API error:", err);
    return handleCORS(
      NextResponse.json(
        { error: err.message || "KB operation failed" },
        { status: 500 },
      ),
      request,
    );
  }
}
