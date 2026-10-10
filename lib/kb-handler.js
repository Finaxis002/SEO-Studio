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
      if (!can("kb.categories") && !can("settings.edit") && !can("blogs.create")) {
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
      if (!can("kb.categories") && !can("settings.edit") && !can("blogs.edit")) {
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
      if (!can("kb.categories") && !can("settings.edit") && !can("blogs.edit")) {
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
      const sp = new URL(request.url).searchParams;
      const q = sp.get("q") || "";
      const categoryId = sp.get("categoryId") || "";
      const categorySlug = sp.get("categorySlug") || "";
      const author = sp.get("author") || "all";
      const status = sp.get("status") || "all";
      const sort = sp.get("sort") || "newest";
      const page = parseInt(sp.get("page") || "1", 10);
      const limit = Math.min(parseInt(sp.get("limit") || "20", 10), 100);

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
      const data = await getKbArticleBySlug(db, slug, true);
      if (!data) {
        return handleCORS(
          NextResponse.json({ error: "Guide not found" }, { status: 404 }),
          request,
        );
      }
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
      if (!can("kb.create") && !can("blogs.create")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      if (body.status === "published" && !can("kb.publish") && !can("blogs.publish")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to publish guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "scheduled" && !can("kb.schedule") && !can("blogs.schedule")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to schedule guides" }, { status: 403 }),
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
      if (!can("kb.edit") && !can("blogs.edit")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const body = await request.json();
      if (body.status === "published" && !can("kb.publish") && !can("blogs.publish")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied to publish guides" }, { status: 403 }),
          request,
        );
      }
      if (body.status === "scheduled" && !can("kb.schedule") && !can("blogs.schedule")) {
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
      if (!can("kb.delete") && !can("blogs.delete")) {
        return handleCORS(
          NextResponse.json({ error: "Permission denied" }, { status: 403 }),
          request,
        );
      }
      const result = await deleteKbArticle(db, actualPath[2]);
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
      if (!can("blogs.create")) {
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
      if (!can("blogs.edit")) {
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
      if (!can("blogs.edit")) {
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
