import { v4 as uuidv4 } from "uuid";
import { clean } from "./db.js";
import { slugify } from "./seo.js";

export const DEFAULT_KB_CATEGORIES = [
  {
    id: "kb-cat-getting-started",
    slug: "getting-started",
    name: "Getting Started",
    icon: "🚀",
    description: "Account setup, business registration, company profile, and initial configurations.",
    order: 1,
    isActive: true,
  },
  {
    id: "kb-cat-billing",
    slug: "billing-invoicing",
    name: "Billing & Invoicing",
    icon: "📄",
    description: "Create sales bills, proforma, quotations, thermal receipts, custom fields, and signatures.",
    order: 2,
    isActive: true,
  },
  {
    id: "kb-cat-inventory",
    slug: "inventory-items",
    name: "Inventory & Items",
    icon: "📦",
    description: "Products vs services, stock levels, marble units, barcodes, and low stock alerts.",
    order: 3,
    isActive: true,
  },
  {
    id: "kb-cat-parties",
    slug: "party-ledger",
    name: "Party & Ledger",
    icon: "👥",
    description: "Customer and vendor balances, shipping addresses, party statements, and khata ledger.",
    order: 4,
    isActive: true,
  },
  {
    id: "kb-cat-accounting",
    slug: "accounting-expenses",
    name: "Accounting & Payments",
    icon: "💰",
    description: "Payment-in, payment-out, cash/bank records, voucher entries, and daily business expenses.",
    order: 5,
    isActive: true,
  },
  {
    id: "kb-cat-trips",
    slug: "trips-transportation",
    name: "Trips & Transportation",
    icon: "🚚",
    description: "Vehicle management, drivers, trip sheets, freight challans, and transportation slips.",
    order: 6,
    isActive: true,
  },
  {
    id: "kb-cat-restaurant",
    slug: "restaurant-pos",
    name: "Restaurant & POS",
    icon: "🍽️",
    description: "Table management, KOT generation, food menus, counter POS billing, and employee login.",
    order: 7,
    isActive: true,
  },
  {
    id: "kb-cat-reports",
    slug: "reports-gst",
    name: "Reports & GST Filing",
    icon: "📊",
    description: "GSTR-1, GSTR-3B summary, Profit & Loss statements, daybook, and Excel exports.",
    order: 8,
    isActive: true,
  },
];

let kbIndexesCreated = false;

/**
 * Creates essential indexes on MongoDB collections for sub-millisecond query performance
 */
export async function ensureKbIndexes(db) {
  if (kbIndexesCreated) return;
  try {
    await Promise.all([
      db.collection("kb_categories").createIndex({ slug: 1 }, { unique: true }).catch(() => {}),
      db.collection("kb_categories").createIndex({ order: 1, isActive: 1 }).catch(() => {}),
      db.collection("kb_articles").createIndex({ slug: 1 }, { unique: true }).catch(() => {}),
      db.collection("kb_articles").createIndex({ categoryId: 1, status: 1, order: 1 }).catch(() => {}),
      db.collection("kb_articles").createIndex({ categorySlug: 1, status: 1 }).catch(() => {}),
      db.collection("kb_articles").createIndex({ status: 1, scheduledAt: 1 }).catch(() => {}),
      db.collection("kb_articles").createIndex({ createdAt: -1 }).catch(() => {}),
      db.collection("kb_articles").createIndex({ updatedAt: -1 }).catch(() => {}),
    ]);
    kbIndexesCreated = true;
  } catch (err) {
    kbIndexesCreated = true;
  }
}

/**
 * Ensures default categories and database indexes exist in MongoDB
 */
export async function ensureKbSeeded(db) {
  try {
    ensureKbIndexes(db);
    const count = await db.collection("kb_categories").countDocuments();
    if (count === 0) {
      const now = new Date().toISOString();
      const docs = DEFAULT_KB_CATEGORIES.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }));
      await db.collection("kb_categories").insertMany(docs);
    }
  } catch (err) {
    console.error("Error seeding default KB categories:", err);
  }
}

// ==========================================
// CATEGORY OPERATIONS
// ==========================================

export async function getKbCategories(db, publicOnly = false) {
  await ensureKbSeeded(db);
  const filter = publicOnly ? { isActive: true } : {};
  const categories = await db
    .collection("kb_categories")
    .find(filter)
    .sort({ order: 1, name: 1 })
    .toArray();

  // Aggregate published article counts per category
  const articleCounts = await db
    .collection("kb_articles")
    .aggregate([
      { $match: publicOnly ? { status: "published" } : {} },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = {};
  articleCounts.forEach((c) => {
    countMap[c._id] = c.count;
  });

  return categories.map((cat) => ({
    ...clean(cat),
    articleCount: countMap[cat.id] || 0,
  }));
}

export async function createKbCategory(db, data) {
  const name = String(data.name || "").trim();
  if (!name) throw new Error("Category name is required");

  const slug = data.slug ? slugify(data.slug) : slugify(name);
  const existing = await db.collection("kb_categories").findOne({ slug });
  if (existing) throw new Error(`Category with slug "${slug}" already exists`);

  const count = await db.collection("kb_categories").countDocuments();
  const now = new Date().toISOString();
  const doc = {
    id: `kb-cat-${uuidv4().slice(0, 8)}`,
    slug,
    name,
    icon: data.icon || "📄",
    description: String(data.description || "").trim(),
    order: typeof data.order === "number" ? data.order : count + 1,
    isActive: data.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("kb_categories").insertOne(doc);
  return clean(doc);
}

export async function updateKbCategory(db, id, data) {
  const existing = await db.collection("kb_categories").findOne({ id });
  if (!existing) throw new Error("Category not found");

  const update = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) update.name = String(data.name).trim();
  if (data.icon !== undefined) update.icon = String(data.icon).trim();
  if (data.description !== undefined) update.description = String(data.description).trim();
  if (data.order !== undefined) update.order = Number(data.order);
  if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
  if (data.slug !== undefined) {
    const newSlug = slugify(data.slug);
    if (newSlug !== existing.slug) {
      const conflict = await db.collection("kb_categories").findOne({ slug: newSlug, id: { $ne: id } });
      if (conflict) throw new Error(`Category with slug "${newSlug}" already exists`);
      update.slug = newSlug;
    }
  }

  await db.collection("kb_categories").updateOne({ id }, { $set: update });

  // If category name or slug changed, update in articles too
  if (update.name || update.slug) {
    const articleUpdates = {};
    if (update.name) articleUpdates.categoryName = update.name;
    if (update.slug) articleUpdates.categorySlug = update.slug;
    await db.collection("kb_articles").updateMany({ categoryId: id }, { $set: articleUpdates });
  }

  return clean({ ...existing, ...update });
}

export async function deleteKbCategory(db, id) {
  // Safety check: Don't allow deletion if articles exist
  const articleCount = await db.collection("kb_articles").countDocuments({ categoryId: id });
  if (articleCount > 0) {
    throw new Error(`Cannot delete category because it contains ${articleCount} active guide(s). Please move or delete the articles first.`);
  }

  const result = await db.collection("kb_categories").deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Category not found");
  return { success: true };
}

// ==========================================
// ARTICLE OPERATIONS
// ==========================================

export async function getKbArticles(db, { query, categoryId, categorySlug, author, status, sort = "newest", page = 1, limit = 20, isPublic = false }) {
  ensureKbIndexes(db);
  // Auto-publish any scheduled guides whose scheduled time has passed
  const now = new Date().toISOString();
  try {
    const dueScheduled = await db
      .collection("kb_articles")
      .find({ status: "scheduled", scheduledAt: { $lte: now } }, { projection: { id: 1 } })
      .toArray();
    if (dueScheduled.length > 0) {
      await db.collection("kb_articles").updateMany(
        { status: "scheduled", scheduledAt: { $lte: now } },
        { $set: { status: "published", publishedAt: now, updatedAt: now } }
      );
    }
  } catch (err) {
    console.error("Auto-publish scheduled KB articles error:", err);
  }

  const filter = {};
  if (isPublic) {
    filter.status = "published";
  } else if (status && status !== "all") {
    filter.status = status;
  }

  if (categoryId && categoryId !== "all") {
    filter.categoryId = categoryId;
  } else if (categorySlug && categorySlug !== "all") {
    filter.categorySlug = categorySlug;
  }

  if (author && author !== "all") {
    filter.author = author;
  }

  if (query && String(query).trim()) {
    const q = String(query).trim();
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { overview: { $regex: q, $options: "i" } },
      { "steps.title": { $regex: q, $options: "i" } },
      { "steps.instruction": { $regex: q, $options: "i" } },
      { "faqs.question": { $regex: q, $options: "i" } },
      { "faqs.answer": { $regex: q, $options: "i" } },
    ];
  }

  // Sorting
  let sortDoc = { createdAt: -1, _id: -1 };
  if (sort === "oldest") {
    sortDoc = { createdAt: 1, _id: 1 };
  } else if (sort === "updated") {
    sortDoc = { updatedAt: -1, _id: -1 };
  } else if (sort === "views") {
    sortDoc = { views: -1, _id: -1 };
  } else if (sort === "alpha") {
    sortDoc = { title: 1 };
  } else if (sort === "order") {
    sortDoc = { order: 1, updatedAt: -1 };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  // Base filter for tab counts without status
  const baseFilter = { ...filter };
  delete baseFilter.status;

  const [total, rawItems, countsAgg] = await Promise.all([
    db.collection("kb_articles").countDocuments(filter),
    db
      .collection("kb_articles")
      .find(filter)
      .project({
        contentHtml: 0,
        steps: 0,
        faqs: 0,
        translations: 0,
      })
      .sort(sortDoc)
      .skip(skip)
      .limit(limit)
      .toArray(),
    isPublic
      ? null
      : db
          .collection("kb_articles")
          .aggregate([
            { $match: baseFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ])
          .toArray(),
  ]);

  const counts = { all: 0, published: 0, scheduled: 0, draft: 0, archived: 0 };
  if (countsAgg) {
    countsAgg.forEach((c) => {
      const s = c._id || "draft";
      if (counts[s] !== undefined) {
        counts[s] = c.count;
      }
      counts.all += c.count;
    });
  }

  return {
    items: clean(rawItems),
    total,
    counts,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getKbArticleBySlug(db, slug, isPublic = true) {
  const cleanSlug = String(slug || "").trim().toLowerCase();
  const filter = {
    slug: cleanSlug,
    ...(isPublic ? { status: "published" } : {}),
  };

  const article = await db.collection("kb_articles").findOne(filter);
  if (!article) return null;

  // Asynchronously increment views without blocking response
  db.collection("kb_articles")
    .updateOne({ id: article.id }, { $inc: { views: 1 } })
    .catch(() => {});

  // Fetch sibling articles in the same category for the Left Navigation Sidebar
  const siblings = await db
    .collection("kb_articles")
    .find(
      {
        categoryId: article.categoryId,
        ...(isPublic ? { status: "published" } : {}),
      },
      {
        projection: {
          id: 1,
          title: 1,
          slug: 1,
          order: 1,
          categorySlug: 1,
        },
      }
    )
    .sort({ order: 1, createdAt: 1 })
    .toArray();

  return {
    article: clean(article),
    siblings: clean(siblings),
  };
}

export async function getKbArticleById(db, id) {
  const article = await db.collection("kb_articles").findOne({ id });
  return article ? clean(article) : null;
}

export async function createKbArticle(db, data, user) {
  const title = String(data.title || "").trim() || "Untitled Guide";

  let slug = data.slug ? slugify(data.slug) : slugify(title);
  // Ensure slug uniqueness
  const conflict = await db.collection("kb_articles").findOne({ slug });
  if (conflict) {
    if (data.slug) {
      throw new Error(`Guide with slug "${slug}" already exists. Please choose a unique slug.`);
    }
    slug = `${slug}-${uuidv4().slice(0, 4)}`;
  }

  // Verify category
  let categoryName = "";
  let categorySlug = "";
  if (data.categoryId) {
    const cat = await db.collection("kb_categories").findOne({ id: data.categoryId });
    if (cat) {
      categoryName = cat.name;
      categorySlug = cat.slug;
    }
  }

  // Calculate next sort order for this category if not explicitly given or <= 0
  let articleOrder = typeof data.order === "number" && data.order > 0 ? data.order : null;
  if (!articleOrder) {
    const highest = await db
      .collection("kb_articles")
      .find({ categoryId: data.categoryId || null })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    articleOrder = (highest[0]?.order || 0) + 1;
  }

  const now = new Date().toISOString();
  const validStatuses = ["published", "draft", "scheduled", "archived"];
  const status = validStatuses.includes(data.status) ? data.status : "draft";

  const doc = {
    id: uuidv4(),
    title,
    slug,
    categoryId: data.categoryId || null,
    categoryName: categoryName || (data.categoryId ? "General" : "Uncategorized"),
    categorySlug: categorySlug || (data.categoryId ? "general" : "uncategorized"),
    author: data.author || user?.name || "Vinimay Team",
    order: articleOrder,
    status,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
    publishedAt: status === "published" ? now : (data.publishedAt ? new Date(data.publishedAt).toISOString() : null),
    overview: String(data.overview || "").trim(),
    contentHtml: String(data.contentHtml || "").trim(),
    prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites.filter(Boolean) : [],
    steps: Array.isArray(data.steps)
      ? data.steps.map((s, idx) => ({
          stepNumber: idx + 1,
          title: String(s.title || "").trim(),
          instruction: String(s.instruction || "").trim(),
          imageUrl: s.imageUrl || "",
          callout: s.callout && s.callout.text ? { type: s.callout.type || "note", text: s.callout.text } : null,
        }))
      : [],
    videoUrl: String(data.videoUrl || "").trim(),
    faqs: Array.isArray(data.faqs)
      ? data.faqs.map((f) => ({
          question: String(f.question || "").trim(),
          answer: String(f.answer || "").trim(),
        }))
      : [],
    helpfulStats: {
      happy: 0,
      neutral: 0,
      sad: 0,
    },
    translations: data.translations || {},
    views: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("kb_articles").insertOne(doc);
  return clean(doc);
}

export async function updateKbArticle(db, id, data) {
  const existing = await db.collection("kb_articles").findOne({ id });
  if (!existing) throw new Error("Article not found");

  const update = { updatedAt: new Date().toISOString() };
  if (data.title !== undefined) update.title = String(data.title).trim();
  if (data.overview !== undefined) update.overview = String(data.overview).trim();
  if (data.contentHtml !== undefined) update.contentHtml = String(data.contentHtml).trim();
  if (data.status !== undefined) {
    const validStatuses = ["published", "draft", "scheduled", "archived"];
    update.status = validStatuses.includes(data.status) ? data.status : "draft";
    if (update.status === "published" && !existing.publishedAt) {
      update.publishedAt = new Date().toISOString();
    }
  }
  if (data.scheduledAt !== undefined) {
    update.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null;
  }
  if (data.publishedAt !== undefined) {
    update.publishedAt = data.publishedAt ? new Date(data.publishedAt).toISOString() : null;
  }
  if (data.order !== undefined) update.order = Number(data.order);
  if (data.videoUrl !== undefined) update.videoUrl = String(data.videoUrl).trim();
  if (data.author !== undefined) update.author = String(data.author).trim();
  if (data.prerequisites !== undefined) {
    update.prerequisites = Array.isArray(data.prerequisites) ? data.prerequisites.filter(Boolean) : [];
  }
  if (data.steps !== undefined) {
    update.steps = Array.isArray(data.steps)
      ? data.steps.map((s, idx) => ({
          stepNumber: idx + 1,
          title: String(s.title || "").trim(),
          instruction: String(s.instruction || "").trim(),
          imageUrl: s.imageUrl || "",
          callout: s.callout && s.callout.text ? { type: s.callout.type || "note", text: s.callout.text } : null,
        }))
      : [];
  }
  if (data.faqs !== undefined) {
    update.faqs = Array.isArray(data.faqs)
      ? data.faqs.map((f) => ({
          question: String(f.question || "").trim(),
          answer: String(f.answer || "").trim(),
        }))
      : [];
  }
  if (data.translations !== undefined) update.translations = data.translations;

  // Category change
  if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) {
    update.categoryId = data.categoryId || null;
    if (data.categoryId) {
      const cat = await db.collection("kb_categories").findOne({ id: data.categoryId });
      if (cat) {
        update.categoryName = cat.name;
        update.categorySlug = cat.slug;
      }
    } else {
      update.categoryName = "Uncategorized";
      update.categorySlug = "uncategorized";
    }
  }

  // Slug change
  if (data.slug && data.slug !== existing.slug) {
    const newSlug = slugify(data.slug);
    const conflict = await db.collection("kb_articles").findOne({ slug: newSlug, id: { $ne: id } });
    if (conflict) throw new Error(`Article with slug "${newSlug}" already exists`);
    update.slug = newSlug;
  }

  await db.collection("kb_articles").updateOne({ id }, { $set: update });
  return clean({ ...existing, ...update });
}

export async function deleteKbArticle(db, id) {
  const result = await db.collection("kb_articles").deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Article not found");
  return { success: true };
}

export async function recordKbFeedback(db, id, rating) {
  if (!["happy", "neutral", "sad"].includes(rating)) {
    throw new Error("Rating must be 'happy', 'neutral', or 'sad'");
  }
  const field = `helpfulStats.${rating}`;
  await db.collection("kb_articles").updateOne({ id }, { $inc: { [field]: 1 } });
  return { success: true };
}

export async function logFailedKbSearch(db, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q || q.length < 2) return;
  try {
    await db.collection("kb_failed_searches").updateOne(
      { query: q },
      {
        $inc: { count: 1 },
        $set: { lastSearchedAt: new Date().toISOString() },
        $setOnInsert: { firstSearchedAt: new Date().toISOString() },
      },
      { upsert: true }
    );
  } catch (_) {}
}

// ==========================================
// TEMPLATE OPERATIONS
// ==========================================

export const BUILTIN_KB_TEMPLATES = [
  {
    id: "kb-tmpl-step-by-step",
    name: "Step-by-Step Tutorial",
    icon: "🎯",
    description: "Overview, prerequisites, 3-step numbered workflow, pro-tip callout, and related guides.",
    isSystem: true,
    contentHtml: `<h2>Overview</h2><p>Briefly describe what this feature does, who should use it, and how it helps save time in Vinimay Accounting Software.</p><div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #5b21b6;"><strong>💡 Prerequisites: </strong>Ensure you have the required user permissions and company profile setup before starting.</div><h2>Step-by-Step Instructions</h2><ol><li><p><strong>Step 1: Open the Module</strong><br>From the left sidebar, navigate to your target section and click on the settings or action button.</p></li><li><p><strong>Step 2: Enter Details &amp; Configure Settings</strong><br>Fill in the required information, review the fields, and customize your preferences.</p></li><li><p><strong>Step 3: Save and Verify</strong><br>Click <strong>Save</strong>. You will see a success confirmation notification confirming the changes are live.</p></li></ol><div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #166534;"><strong>✅ Pro Tip: </strong>You can also use keyboard shortcuts to perform this action much faster.</div><h2>Next Steps &amp; Related Guides</h2><p>Once you have configured this, explore how to generate detailed reports or share invoices directly over WhatsApp.</p>`,
  },
  {
    id: "kb-tmpl-feature-setup",
    name: "Feature Setup & Configuration",
    icon: "⚙️",
    description: "Detailed setup guide for new modules, toggles, preferences, or company-wide settings.",
    isSystem: true,
    contentHtml: `<h2>Introduction to the Feature</h2><p>Learn how to enable, configure, and maximize the efficiency of this module for your business operations.</p><h2>Key Benefits</h2><ul><li><strong>Time Saving:</strong> Automates repetitive manual data entry.</li><li><strong>Accuracy:</strong> Prevents accounting discrepancies and duplicate entries.</li><li><strong>GST Compliance:</strong> Ensures 100% compliance with government invoicing rules.</li></ul><h2>How to Enable &amp; Configure</h2><ol><li><p><strong>Enable the Module:</strong> Go to <em>Settings &gt; Features</em> and toggle this option to ON.</p></li><li><p><strong>Set Preferences:</strong> Choose your default tax rates, series prefix, or numbering rules.</p></li><li><p><strong>Assign Permissions:</strong> Allow specific staff members or cashiers access to this module.</p></li></ol><div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #5b21b6;"><strong>💡 Recommendation: </strong>Review the preview before applying changes across your entire business.</div>`,
  },
  {
    id: "kb-tmpl-troubleshooting",
    name: "Troubleshooting & Problem Fix",
    icon: "🔧",
    description: "Common error symptoms, root causes, 3-step resolution, and support escalation.",
    isSystem: true,
    contentHtml: `<h2>Issue Summary</h2><p>This troubleshooting guide helps you quickly resolve errors or unexpected behavior when performing this operation.</p><div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #9f1239;"><strong>⚠️ Symptoms: </strong>The bill preview fails to load, or numbers appear incorrectly on thermal printouts.</div><h2>Common Causes</h2><ul><li>Missing mandatory party GSTIN or State Code.</li><li>Outdated printer driver or incorrect page margin configuration.</li><li>Temporary network connectivity or session timeout.</li></ul><h2>Step-by-Step Resolution</h2><ol><li><p><strong>Check Connection &amp; Refresh:</strong> Log out and log back in, or press <em>Ctrl + Shift + R</em> to clear browser cache.</p></li><li><p><strong>Verify Data Fields:</strong> Ensure all mandatory asterisk (*) fields are filled correctly.</p></li><li><p><strong>Reset Printer Margins:</strong> In print settings, select 'Default Margins' and set scale to 100%.</p></li></ol><div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #166534;"><strong>✅ Need Help? </strong>Reach out to Vinimay Priority Support via WhatsApp or in-app chat for instant assistance.</div>`,
  },
  {
    id: "kb-tmpl-quick-start",
    name: "Quick Start (5-Minute Workflow)",
    icon: "⚡",
    description: "Fast, concise 3-step guide for beginners to finish a billing or stock entry in 5 minutes.",
    isSystem: true,
    contentHtml: `<h2>Quick Overview</h2><p>Follow these 3 quick steps to complete your task in less than 5 minutes.</p><ol><li><p><strong>Step 1:</strong> Select party or item from the dropdown.</p></li><li><p><strong>Step 2:</strong> Enter quantity, price, and applicable discount.</p></li><li><p><strong>Step 3:</strong> Click <strong>Save &amp; Print</strong> or <strong>Share via WhatsApp</strong>.</p></li></ol><div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 16px 0; color: #5b21b6;"><strong>💡 Fast Track: </strong>Use the Barcode Scanner for instant item adding without typing!</div>`,
  },
];

export async function getKbTemplates(db) {
  const customTemplates = await db
    .collection("kb_templates")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  const customMap = new Map(customTemplates.map((t) => [t.id, t]));
  const mergedBuiltins = BUILTIN_KB_TEMPLATES.filter((b) => {
    const override = customMap.get(b.id);
    return !override?.isDeleted;
  }).map((b) => {
    if (customMap.has(b.id)) {
      const override = customMap.get(b.id);
      customMap.delete(b.id);
      return { ...b, ...clean(override), isCustom: true };
    }
    return b;
  });

  const remainingCustom = Array.from(customMap.values()).filter((t) => !t.isDeleted);
  return [...mergedBuiltins, ...clean(remainingCustom)];
}

export async function createKbTemplate(db, data) {
  const name = String(data.name || "").trim();
  if (!name) throw new Error("Template name is required");

  const description = String(data.description || "").trim();
  if (!description) throw new Error("Template description is required");

  const contentHtml = String(data.contentHtml || "").trim();
  const textOnly = contentHtml.replace(/<[^>]*>/g, "").trim();
  if (!textOnly) throw new Error("Template content & layout is required");

  const icon = String(data.icon || "").trim() || "📄";

  const doc = {
    id: `kb-tmpl-${uuidv4().slice(0, 8)}`,
    name,
    icon,
    description,
    contentHtml,
    faqs: [],
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  await db.collection("kb_templates").insertOne(doc);
  return clean(doc);
}

export async function updateKbTemplate(db, id, data) {
  const updateData = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new Error("Template name is required");
    updateData.name = name;
  }
  if (data.description !== undefined) {
    const description = String(data.description).trim();
    if (!description) throw new Error("Template description is required");
    updateData.description = description;
  }
  if (data.icon !== undefined) {
    updateData.icon = String(data.icon).trim() || "📄";
  }
  if (data.contentHtml !== undefined) {
    const contentHtml = String(data.contentHtml).trim();
    const textOnly = contentHtml.replace(/<[^>]*>/g, "").trim();
    if (!textOnly) throw new Error("Template content & layout is required");
    updateData.contentHtml = contentHtml;
  }
  updateData.updatedAt = new Date().toISOString();

  const res = await db.collection("kb_templates").findOneAndUpdate(
    { id },
    { $set: updateData },
    { upsert: true, returnDocument: "after" }
  );
  return clean(res);
}

export async function deleteKbTemplate(db, id) {
  const isBuiltin = BUILTIN_KB_TEMPLATES.some((b) => b.id === id);
  if (isBuiltin) {
    await db.collection("kb_templates").updateOne(
      { id },
      { $set: { id, isDeleted: true, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return { success: true };
  }

  const result = await db.collection("kb_templates").deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Template not found or cannot be deleted");
  return { success: true };
}


