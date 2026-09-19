import { v4 as uuidv4 } from "uuid";
import { analyzeSeo } from "./seo";
import { hashPassword } from "./auth";

const IMG = [
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=1200&auto=format&fit=crop",
  "https://images.pexels.com/photos/669612/pexels-photo-669612.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=1200&auto=format&fit=crop",
  "https://images.pexels.com/photos/12969403/pexels-photo-12969403.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.unsplash.com/photo-1537731121640-bc1c4aba9b80?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=1200&auto=format&fit=crop",
  "https://images.pexels.com/photos/7688432/pexels-photo-7688432.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.unsplash.com/photo-1571677246347-5040036b95cc?q=80&w=1200&auto=format&fit=crop",
  "https://images.pexels.com/photos/7651801/pexels-photo-7651801.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1664277497095-424e085175e8?q=80&w=1200&auto=format&fit=crop",
  "https://images.pexels.com/photos/15635241/pexels-photo-15635241.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const CATEGORIES = [
  "SEO Fundamentals",
  "Technical SEO",
  "Content Marketing",
  "Link Building",
  "Local SEO",
  "Keyword Research",
  "Analytics & Reporting",
  "Digital Marketing",
];

const SUBCATEGORIES = [
  "Audits",
  "Guides",
  "Strategy",
  "Playbooks",
  "Optimization",
  "Checklists",
  "Tools",
  "Trends",
];

export const WORKSPACE_OPTIONS = {
  departments: ["SEO", "Content", "Leadership", "Operations", "Growth"],
  timezones: ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"],
  languages: ["English", "Hindi", "German", "Spanish"],
  defaultStatuses: ["draft", "in_review"],
  categories: CATEGORIES,
  subcategories: SUBCATEGORIES,
};

export const DEFAULT_PERMISSIONS = [
  {
    group: "Content",
    items: [
      {
        key: "blogs.view",
        label: "View Blogs",
        desc: "See all blog posts in the dashboard and lists.",
      },
      {
        key: "blogs.create",
        label: "Create Blogs",
        desc: "Start new drafts in the blog editor.",
      },
      {
        key: "blogs.edit",
        label: "Edit Blogs",
        desc: "Modify content, metadata and media of blogs.",
      },
      {
        key: "blogs.delete",
        label: "Delete Blogs",
        desc: "Permanently remove blogs from the system.",
      },
      {
        key: "blogs.publish",
        label: "Publish Blogs",
        desc: "Approve and make blogs live on the website.",
      },
      {
        key: "blogs.schedule",
        label: "Schedule Blogs",
        desc: "Queue blogs to publish at a future date and time.",
      },
      {
        key: "blogs.archive",
        label: "Archive Blogs",
        desc: "Move outdated blogs out of the active workflow.",
      },
    ],
  },
  {
    group: "SEO",
    items: [
      {
        key: "seo.view",
        label: "View SEO Data",
        desc: "See SEO scores, checklists and metadata.",
      },
      {
        key: "seo.edit",
        label: "Edit SEO Metadata",
        desc: "Change titles, descriptions, canonicals and robots.",
      },
      {
        key: "seo.keywords",
        label: "Manage Keywords",
        desc: "Add, import and organize tracked keywords.",
      },
      {
        key: "seo.issues.view",
        label: "View SEO Issues",
        desc: "See the site-wide SEO issues dashboard.",
      },
      {
        key: "seo.issues.resolve",
        label: "Resolve SEO Issues",
        desc: "Fix SEO issues across blogs and media.",
      },
    ],
  },
  {
    group: "Media",
    items: [
      {
        key: "media.view",
        label: "View Media",
        desc: "Browse the media library and image details.",
      },
      {
        key: "media.upload",
        label: "Upload Media",
        desc: "Add new images and files to the library.",
      },
      {
        key: "media.edit",
        label: "Edit Media",
        desc: "Update alt text, captions and organize folders.",
      },
      {
        key: "media.delete",
        label: "Delete Media",
        desc: "Remove files from the library.",
      },
    ],
  },
  {
    group: "Analytics",
    items: [
      {
        key: "analytics.view",
        label: "View Analytics",
        desc: "Access traffic and performance dashboards.",
      },
      {
        key: "analytics.export",
        label: "Export Analytics",
        desc: "Download reports as CSV.",
      },
    ],
  },
  {
    group: "Team",
    items: [
      {
        key: "team.view",
        label: "View Team",
        desc: "See team members and their activity.",
      },
      {
        key: "team.invite",
        label: "Invite Users",
        desc: "Send invitations to new team members.",
      },
      {
        key: "team.edit",
        label: "Edit Users",
        desc: "Change member roles, departments and status.",
      },
      {
        key: "team.delete",
        label: "Delete Users",
        desc: "Remove members from the workspace.",
      },
      {
        key: "team.roles",
        label: "Manage Roles",
        desc: "Create roles and change permission matrices.",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "settings.view",
        label: "View Settings",
        desc: "Open workspace settings pages.",
      },
      {
        key: "settings.edit",
        label: "Edit Settings",
        desc: "Change general, SEO and publishing settings.",
      },
    ],
  },
];

const ALL_PERMS = DEFAULT_PERMISSIONS.flatMap((g) => g.items.map((i) => i.key));

function rolePerms(keys) {
  return keys;
}

const ROLES = [
  {
    id: uuidv4(),
    name: "Super Admin",
    slug: "super-admin",
    description: "Unrestricted access to every part of the workspace.",
    isCustom: false,
    permissions: rolePerms([...ALL_PERMS]),
  },
  {
    id: uuidv4(),
    name: "Admin",
    slug: "admin",
    description: "Manages users, permissions, content and settings.",
    isCustom: false,
    permissions: rolePerms([...ALL_PERMS]),
  },
  {
    id: uuidv4(),
    name: "SEO Manager",
    slug: "seo-manager",
    description:
      "Approves content, publishes, schedules and owns SEO strategy.",
    isCustom: false,
    permissions: rolePerms([
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "blogs.publish",
      "blogs.schedule",
      "blogs.archive",
      "seo.view",
      "seo.edit",
      "seo.keywords",
      "seo.issues.view",
      "seo.issues.resolve",
      "media.view",
      "media.upload",
      "media.edit",
      "media.delete",
      "analytics.view",
      "analytics.export",
      "team.view",
      "settings.view",
    ]),
  },
  {
    id: uuidv4(),
    name: "SEO Executive",
    slug: "seo-executive",
    description:
      "Optimizes content, manages keywords and submits for approval.",
    isCustom: false,
    permissions: rolePerms([
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "seo.view",
      "seo.edit",
      "seo.keywords",
      "seo.issues.view",
      "seo.issues.resolve",
      "media.view",
      "media.upload",
      "media.edit",
      "analytics.view",
      "team.view",
    ]),
  },
  {
    id: uuidv4(),
    name: "Content Writer",
    slug: "content-writer",
    description: "Writes and edits own drafts, uploads images, edits metadata.",
    isCustom: false,
    permissions: rolePerms([
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "seo.view",
      "seo.edit",
      "media.view",
      "media.upload",
      "media.edit",
    ]),
  },
  {
    id: uuidv4(),
    name: "Editor",
    slug: "editor",
    description: "Reviews, approves, publishes and schedules content.",
    isCustom: false,
    permissions: rolePerms([
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "blogs.publish",
      "blogs.schedule",
      "blogs.archive",
      "seo.view",
      "seo.edit",
      "media.view",
      "media.upload",
      "media.edit",
      "media.delete",
      "analytics.view",
      "team.view",
    ]),
  },
  {
    id: uuidv4(),
    name: "Viewer",
    slug: "viewer",
    description: "Read-only access to content and analytics.",
    isCustom: false,
    permissions: rolePerms([
      "blogs.view",
      "seo.view",
      "media.view",
      "analytics.view",
      "team.view",
    ]),
  },
];

const TEAM = [
  {
    id: "u1",
    name: "Ayushi Sharma",
    email: "ayushi@seostudio.io",
    role: "Super Admin",
    department: "Leadership",
    status: "active",
    blogsCreated: 12,
    blogsPublished: 10,
    lastActive: "2 min ago",
    joinedAt: "2023-04-11",
  },
  {
    id: "u2",
    name: "Neha Verma",
    email: "neha@seostudio.io",
    role: "SEO Manager",
    department: "SEO",
    status: "active",
    blogsCreated: 9,
    blogsPublished: 8,
    lastActive: "18 min ago",
    joinedAt: "2023-06-02",
  },
  {
    id: "u3",
    name: "Rahul Gupta",
    email: "rahul@seostudio.io",
    role: "SEO Executive",
    department: "SEO",
    status: "active",
    blogsCreated: 14,
    blogsPublished: 9,
    lastActive: "1 hr ago",
    joinedAt: "2023-09-18",
  },
  {
    id: "u4",
    name: "Priya Nair",
    email: "priya@seostudio.io",
    role: "Content Writer",
    department: "Content",
    status: "active",
    blogsCreated: 21,
    blogsPublished: 16,
    lastActive: "3 hrs ago",
    joinedAt: "2024-01-08",
  },
  {
    id: "u5",
    name: "Vikram Singh",
    email: "vikram@seostudio.io",
    role: "Editor",
    department: "Content",
    status: "active",
    blogsCreated: 6,
    blogsPublished: 6,
    lastActive: "26 min ago",
    joinedAt: "2023-11-27",
  },
  {
    id: "u6",
    name: "Anjali Patel",
    email: "anjali@seostudio.io",
    role: "Content Writer",
    department: "Content",
    status: "active",
    blogsCreated: 17,
    blogsPublished: 11,
    lastActive: "Yesterday",
    joinedAt: "2024-03-15",
  },
  {
    id: "u7",
    name: "Karan Malhotra",
    email: "karan@seostudio.io",
    role: "Admin",
    department: "Operations",
    status: "inactive",
    blogsCreated: 3,
    blogsPublished: 3,
    lastActive: "12 days ago",
    joinedAt: "2023-02-20",
  },
  {
    id: "u8",
    name: "Sneha Iyer",
    email: "sneha@seostudio.io",
    role: "Viewer",
    department: "Growth",
    status: "active",
    blogsCreated: 0,
    blogsPublished: 0,
    lastActive: "5 hrs ago",
    joinedAt: "2024-08-01",
  },
];

const PARAS = [
  "Search engines have changed dramatically over the last few years, and the teams that win organic traffic today are the ones that treat optimization as an ongoing discipline rather than a one-time checklist.",
  "Before you write a single line, understand the search intent behind your target keyword. Are users looking for a definition, a comparison, a tutorial, or a product page? Matching intent is the single highest-leverage SEO decision you will make.",
  "A well-structured article keeps readers scrolling. Use descriptive H2 sections, short paragraphs, and contextual internal links to guide both humans and crawlers through the page.",
  "Keyword density is no longer a magic number, but your focus keyword should still appear naturally in the title, the introduction, at least one subheading, and the conclusion.",
  "Internal linking distributes authority across your site and helps Google discover new pages faster. Aim for three to five relevant internal links per article, using descriptive anchor text instead of generic phrases like click here.",
  "Images matter more than most teams realize. Compress every image, serve modern formats like WebP, and always write descriptive alt text for both accessibility and image search visibility.",
  "Meta descriptions do not directly affect rankings, but they strongly influence click-through rates. Write them like ad copy: lead with the benefit, include the keyword, and keep them under 160 characters.",
  "Core Web Vitals are a confirmed ranking signal. Monitor LCP, INP, and CLS in field data, and fix the templates that fail thresholds before publishing new content at scale.",
  "Content refreshes are the fastest SEO win available to most teams. Updating titles, consolidating outdated sections, and adding fresh data can lift a decaying page back into the top positions within weeks.",
  "E-E-A-T, which stands for Experience, Expertise, Authoritativeness and Trust, is how Google assesses quality. Add author bios, cite original sources, and demonstrate first-hand experience in your niche.",
  "Structured data helps search engines understand your content and unlocks rich results. Add FAQ, HowTo, or Article schema wherever it genuinely matches the page content.",
  "Measure what matters: organic clicks, average position, engaged sessions, and conversions attributed to content. Vanity metrics like raw impressions rarely tell the full story.",
];

function makeContent(opts) {
  const k = opts.keyword;
  const altAttr = opts.noAlt ? "" : ' alt="' + k + ' illustration"';
  let html = "<p>" + PARAS[1].replace("your target keyword", k) + "</p>";
  html += "<p>" + PARAS[0] + "</p>";
  html += "<h2>Why " + k + " matters in 2025</h2>";
  html += "<p>" + PARAS[3] + "</p>";
  html += "<p>" + PARAS[2] + "</p>";
  html += "<h2>How to get " + k + " right: step-by-step</h2>";
  html += "<h3>1. Research and map intent</h3><p>" + PARAS[1] + "</p>";
  html += "<h3>2. Optimize on-page fundamentals</h3><p>" + PARAS[6] + "</p>";
  html +=
    '<figure><img src="' +
    opts.img +
    '"' +
    altAttr +
    " />" +
    (opts.noCaption
      ? ""
      : "<figcaption>" + k + " workflow in SEO Studio</figcaption>") +
    "</figure>";
  html += "<blockquote>" + PARAS[4] + "</blockquote>";
  html += "<h3>3. Build topical authority</h3><p>" + PARAS[8] + "</p>";
  if (!opts.noInternal) {
    html +=
      '<p>For a deeper dive, read our guide on <a href="/blog/' +
      (opts.internalSlug || "complete-technical-seo-audit-checklist") +
      '">' +
      (opts.internalTitle || "technical SEO audits") +
      '</a> and bookmark the official <a href="https://developers.google.com/search/docs">Google Search documentation</a>.</p>';
  } else {
    html +=
      '<p>You can also read the <a href="https://developers.google.com/search/docs">Google Search documentation</a> for background.</p>';
  }
  html +=
    "<h2>Common mistakes to avoid</h2><ul><li>Targeting keywords that do not match the content format users expect.</li><li>Publishing thin pages that duplicate existing articles.</li><li>Ignoring image optimization and accessibility.</li><li>Letting high-potential pages decay without refreshes.</li></ul>";
  html += "<h2>Measuring results</h2><p>" + PARAS[11] + "</p>";
  html += "<p>" + PARAS[10] + "</p>";
  return html;
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();

const BLOG_DEFS = [
  {
    title: "The Complete Technical SEO Audit Checklist for 2025",
    slug: "complete-technical-seo-audit-checklist",
    category: "Technical SEO",
    subcategory: "Audits",
    author: "Neha Verma",
    status: "published",
    days: 42,
    keyword: "technical SEO audit",
    tags: ["technical seo", "audit", "checklist"],
    img: IMG[0],
    views: 48200,
    score: 92,
    featuredAlt: "Technical SEO audit dashboard on a laptop",
  },
  {
    title: "10 Best Digital Marketing Strategies to Scale Your Business",
    slug: "best-digital-marketing-strategies",
    category: "Digital Marketing",
    subcategory: "Strategy",
    author: "Priya Nair",
    status: "published",
    days: 30,
    keyword: "digital marketing strategies",
    tags: ["strategy", "growth"],
    img: IMG[1],
    views: 65100,
    score: 88,
    featuredAlt: "Team planning digital marketing strategies",
  },
  {
    title: "How to Do Keyword Research Like a Pro: Step-by-Step Guide",
    slug: "keyword-research-guide",
    category: "Keyword Research",
    subcategory: "Guides",
    author: "Rahul Gupta",
    status: "published",
    days: 21,
    keyword: "keyword research",
    tags: ["keyword research", "serp"],
    img: IMG[2],
    views: 51800,
    score: 85,
    featuredAlt: "Keyword research spreadsheet",
  },
  {
    title: "Core Web Vitals: A Practical Guide to Faster Rankings",
    slug: "core-web-vitals-guide",
    category: "Technical SEO",
    subcategory: "Performance",
    author: "Neha Verma",
    status: "published",
    days: 14,
    keyword: "core web vitals",
    tags: ["performance", "cwv"],
    img: IMG[3],
    views: 39400,
    score: 90,
    featuredAlt: "Speed test metrics chart",
  },
  {
    title: "Local SEO Playbook: Rank #1 in Google Maps",
    slug: "local-seo-playbook",
    category: "Local SEO",
    subcategory: "Playbooks",
    author: "Rahul Gupta",
    status: "published",
    days: 9,
    keyword: "local SEO",
    tags: ["local", "maps", "gbp"],
    img: IMG[4],
    views: 27600,
    score: 81,
    featuredAlt: "Map with local business pins",
  },
  {
    title: "Content Optimization: 12 Tactics to Refresh Old Blog Posts",
    slug: "content-optimization-tactics",
    category: "Content Marketing",
    subcategory: "Optimization",
    author: "Priya Nair",
    status: "published",
    days: 6,
    keyword: "content optimization",
    tags: ["refresh", "content"],
    img: IMG[5],
    views: 33900,
    score: 87,
    featuredAlt: "Editor optimizing an article draft",
  },
  {
    title: "E-E-A-T Explained: How to Win Google\u2019s Trust in 2025",
    slug: "eeat-explained",
    category: "SEO Fundamentals",
    subcategory: "Quality",
    author: "Ayushi Sharma",
    status: "published",
    days: 3,
    keyword: "e-e-a-t",
    tags: ["eeat", "quality"],
    img: IMG[6],
    views: 18800,
    score: 84,
    featuredAlt: "Trust and quality illustration",
  },
  {
    title: "AI in SEO: How Generative Engine Optimization Changes Everything",
    slug: "generative-engine-optimization",
    category: "SEO Fundamentals",
    subcategory: "AI",
    author: "Neha Verma",
    status: "scheduled",
    days: -3,
    keyword: "generative engine optimization",
    tags: ["ai", "geo"],
    img: IMG[7],
    views: 0,
    score: 78,
    featuredAlt: "Abstract AI neural network visual",
  },
  {
    title: "Link Building Strategies That Actually Work in 2025",
    slug: "link-building-strategies",
    category: "Link Building",
    subcategory: "Strategies",
    author: "Rahul Gupta",
    status: "in_review",
    days: 1,
    keyword: "link building",
    tags: ["backlinks", "outreach"],
    img: IMG[8],
    views: 0,
    score: 74,
    featuredAlt: "Network of connected links",
  },
  {
    title: "SEO for SaaS: The Ultimate Growth Guide",
    slug: "seo-for-saas",
    category: "SEO Fundamentals",
    subcategory: "SaaS",
    author: "Priya Nair",
    status: "in_review",
    days: 0,
    keyword: "saas seo",
    tags: ["saas", "growth"],
    img: IMG[9],
    views: 0,
    score: 69,
    featuredAlt: "SaaS growth dashboard",
  },
  {
    title: "Google Search Console: 15 Reports Every Marketer Should Track",
    slug: "google-search-console-reports",
    category: "Analytics & Reporting",
    subcategory: "Tools",
    author: "Vikram Singh",
    status: "approved",
    days: 2,
    keyword: "google search console",
    tags: ["gsc", "reports"],
    img: IMG[10],
    views: 0,
    score: 80,
    featuredAlt: "Search Console performance report",
  },
  {
    title: "Voice Search Optimization: Preparing for the Next Billion Queries",
    slug: "voice-search-optimization",
    category: "SEO Fundamentals",
    subcategory: "Voice",
    author: "Anjali Patel",
    status: "draft",
    days: 1,
    keyword: "voice search optimization",
    tags: ["voice", "mobile"],
    img: IMG[11],
    views: 0,
    score: 58,
    noMetaDesc: true,
    featuredAlt: "Person using voice assistant on phone",
  },
  {
    title: "International SEO: Hreflang Tags Made Simple",
    slug: "international-seo-hreflang",
    category: "Technical SEO",
    subcategory: "International",
    author: "Anjali Patel",
    status: "draft",
    days: 2,
    keyword: "international SEO",
    tags: ["hreflang", "global"],
    img: IMG[12],
    views: 0,
    score: 54,
    noAlt: true,
    noInternal: true,
    noCanonical: true,
    featuredAlt: "",
  },
  {
    title:
      "SEO Writing: An Insanely Long Title That Keeps Going and Going Way Past Sixty Characters For Testing",
    slug: "on-page-seo-checklist-before-publish",
    category: "Content Marketing",
    subcategory: "Checklists",
    author: "Rahul Gupta",
    status: "draft",
    days: 3,
    keyword: "on page SEO",
    tags: ["on-page", "checklist"],
    img: IMG[5],
    views: 0,
    score: 49,
    noMetaDesc: true,
    noInternal: true,
    longTitle: true,
    featuredAlt: "Publishing checklist on a notepad",
  },
];

const KEYWORDS = [
  ["technical SEO audit", 5400, 62, 4, 7],
  ["keyword research", 8100, 58, 6, 9],
  ["core web vitals", 6600, 71, 9, 11],
  ["local SEO", 9900, 65, 3, 3],
  ["content optimization", 4400, 54, 5, 8],
  ["link building", 12100, 78, 12, 14],
  ["digital marketing strategies", 6600, 60, 8, 12],
  ["saas seo", 2900, 49, 11, 13],
  ["e-e-a-t", 1900, 44, 6, 6],
  ["voice search optimization", 3600, 57, 15, 19],
  ["international SEO", 2400, 52, 10, 12],
  ["generative engine optimization", 1300, 38, 14, 22],
  ["seo checklist", 5400, 51, 7, 9],
  ["google search console", 14800, 69, 5, 5],
  ["on page SEO", 9900, 63, 6, 10],
  ["long tail keywords", 4400, 47, 9, 11],
  ["seo score", 3300, 41, 8, 8],
  ["meta description", 8100, 55, 4, 6],
];

export async function ensureSeeded(db) {
  if (globalThis.__seoStudioSeeded) return;
  const count = await db.collection("blogs").countDocuments();
  const allowSeed =
    process.env.NODE_ENV !== "production" ||
    process.env.SEED_ON_BOOT === "true";
  const passwordHash = hashPassword(
    process.env.SEED_USER_PASSWORD || "ChangeMe123!",
  );
  if (count > 0) {
    await db
      .collection("team")
      .updateMany(
        { passwordHash: { $exists: false } },
        { $set: { passwordHash } },
      );
    if ((await db.collection("permission_catalog").countDocuments()) === 0)
      await db
        .collection("permission_catalog")
        .insertOne({ id: "default", groups: DEFAULT_PERMISSIONS });
    await db
      .collection("workspace_config")
      .updateOne(
        { id: "default" },
        { $set: WORKSPACE_OPTIONS },
        { upsert: true },
      );
    globalThis.__seoStudioSeeded = true;
    return;
  }

  if (!allowSeed) {
    globalThis.__seoStudioSeeded = true;
    return;
  }

  // Roles
  await db.collection("roles").insertMany(ROLES.map((r) => ({ ...r })));
  await db
    .collection("permission_catalog")
    .insertOne({ id: "default", groups: DEFAULT_PERMISSIONS });
  await db
    .collection("workspace_config")
    .insertOne({ id: "default", ...WORKSPACE_OPTIONS });

  // Team
  await db
    .collection("team")
    .insertMany(TEAM.map((m) => ({ ...m, permissions: [], passwordHash })));

  // Blogs
  const blogs = BLOG_DEFS.map((d, i) => {
    const published = d.status === "published";
    const metaDesc = d.noMetaDesc
      ? ""
      : "Master " +
        d.keyword +
        " with this practical guide — proven steps, expert tips, and a checklist you can apply to your content strategy today.";
    const contentHtml = makeContent({
      keyword: d.keyword,
      img: d.img,
      noAlt: d.noAlt,
      noInternal: d.noInternal,
      internalSlug:
        d.slug !== "complete-technical-seo-audit-checklist"
          ? "complete-technical-seo-audit-checklist"
          : "keyword-research-guide",
      internalTitle:
        d.slug !== "complete-technical-seo-audit-checklist"
          ? "technical SEO audits"
          : "keyword research",
    });
    const words = contentHtml
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    const seo = {
      metaTitle: d.longTitle ? d.title : d.title.slice(0, 60),
      metaDescription: metaDesc,
      canonical: d.noCanonical ? "" : "https://example.com/blog/" + d.slug,
      robots: { index: true, follow: true },
      focusKeyword: d.keyword,
      secondaryKeywords: [
        d.keyword + " guide",
        d.keyword + " tips",
        d.keyword + " checklist",
      ],
      ogTitle: d.title,
      ogDescription: metaDesc || d.title,
      ogImage: d.img,
      twitterTitle: d.title,
      twitterDescription: metaDesc || d.title,
      twitterImage: d.img,
    };
    const doc = {
      id: uuidv4(),
      title: d.title,
      slug: d.slug,
      category: d.category,
      subcategory: d.subcategory,
      tags: d.tags,
      author: d.author,
      authorId: (TEAM.find((t) => t.name === d.author) || {}).id || "u1",
      excerpt:
        "A complete, practical guide to " +
        d.keyword +
        " — what it is, why it matters, and exactly how to execute it.",
      featuredImage: {
        url: d.img,
        alt: d.featuredAlt || "",
        title: d.keyword + " featured image",
        caption: "",
      },
      contentHtml,
      wordCount: words,
      status: d.status,
      scheduledAt:
        d.status === "scheduled" ? daysAhead(Math.abs(d.days)) : null,
      publishedAt: published ? daysAgo(d.days) : null,
      createdAt: daysAgo(d.days + 5),
      updatedAt: daysAgo(Math.max(d.days - 1, 0)),
      seo,
      analytics: {
        views: d.views,
        organic: Math.round(d.views * 0.68),
        avgTime: 264,
        bounce: 38,
        conversions: Math.round(d.views * 0.021),
        impressions: Math.round(d.views * 14),
        clicks: Math.round(d.views * 0.68),
      },
      brief: {
        targetKeyword: d.keyword,
        intent: "Informational",
        audience: "Marketing teams and SEO specialists",
        contentType: "Guide",
        wordCount: 1200,
        competitorUrls: [],
        secondary: seo.secondaryKeywords,
        questions: [],
        requiredHeadings: [],
        internalLinks: [],
        externalRefs: [],
      },
      savedSuggestions: [],
    };
    const a = analyzeSeo(doc);
    doc.seo.score = d.score || a.score;
    return doc;
  });
  await db.collection("blogs").insertMany(blogs);

  // Media
  const mediaDefs = IMG.map((url, i) => {
    const names = [
      "technical-seo-audit-dashboard",
      "digital-marketing-strategy",
      "keyword-research-sheet",
      "core-web-vitals-report",
      "local-seo-map",
      "content-optimization-desk",
      "eeat-trust-graphic",
      "ai-neural-network",
      "link-building-network",
      "saas-growth-dashboard",
      "search-console-report",
      "voice-assistant-phone",
      "publishing-checklist",
    ];
    const dims = [
      [1280, 720],
      [1200, 800],
      [1140, 760],
      [1280, 720],
      [1100, 740],
      [1200, 800],
      [1080, 1080],
      [1280, 720],
      [1200, 750],
      [1280, 720],
      [1180, 780],
      [1100, 730],
      [1200, 800],
    ];
    const fmts = [
      "JPEG",
      "JPEG",
      "PNG",
      "JPEG",
      "PNG",
      "WebP",
      "WebP",
      "JPEG",
      "PNG",
      "JPEG",
      "WebP",
      "JPEG",
      "WebP",
    ];
    const sizes = [
      184320, 221184, 348160, 192512, 286720, 98304, 87040, 204800, 327680,
      176128, 94208, 198656, 89344,
    ];
    const folders = [
      "Blog Images",
      "Featured Images",
      "Blog Images",
      "Blog Images",
      "Featured Images",
      "Blog Images",
      "Social Media",
      "Blog Images",
      "Blog Images",
      "Featured Images",
      "Blog Images",
      "Blog Images",
      "Unused Images",
    ];
    return {
      id: uuidv4(),
      name: names[i] + "." + fmts[i].toLowerCase(),
      url,
      type: "image",
      folder: folders[i],
      size: sizes[i],
      dimensions: { width: dims[i][0], height: dims[i][1] },
      format: fmts[i],
      alt: names[i].replace(/-/g, " "),
      title: names[i].replace(/-/g, " "),
      caption: "",
      description: "",
      uploadedBy: TEAM[i % TEAM.length].name,
      uploadedAt: daysAgo(30 - i * 2),
      usedIn: [],
      compressed: fmts[i] === "WebP",
    };
  });
  // link media to blogs
  const slugToBlog = {};
  blogs.forEach((b) => (slugToBlog[b.slug] = b));
  mediaDefs.forEach((m, i) => {
    const b = blogs[i % blogs.length];
    m.usedIn = [{ blogId: b.id, title: b.title }];
  });
  await db.collection("media").insertMany(mediaDefs);

  // Keywords
  const kwDocs = KEYWORDS.map(([kw, vol, diff, pos, prev], i) => ({
    id: uuidv4(),
    keyword: kw,
    volume: vol,
    difficulty: diff,
    position: pos,
    previousPosition: prev,
    trend: Array.from({ length: 10 }, (_, j) =>
      Math.max(
        1,
        Math.round(pos + Math.sin(j / 2 + i) * 3 + (prev - pos) * (j / 9)),
      ),
    ),
    history: Array.from({ length: 12 }, (_, j) => ({
      month: j,
      position: Math.max(
        1,
        Math.round(
          pos + ((11 - j) * (prev - pos)) / 11 + Math.sin(j + i) * 1.5,
        ),
      ),
    })),
    targetUrl: "/blog/" + (BLOG_DEFS.find((b) => b.keyword === kw) || {}).slug,
    targetBlog: (BLOG_DEFS.find((b) => b.keyword === kw) || {}).title || "",
    status: pos <= 3 ? "top3" : pos <= 10 ? "improving" : "needs-attention",
    country: "Global",
    intent:
      i % 3 === 0
        ? "Informational"
        : i % 3 === 1
          ? "Commercial"
          : "Transactional",
    serpFeatures: [
      ["Featured Snippet", "People Also Ask"],
      ["Video Pack"],
      ["Sitelinks", "People Also Ask"],
      ["Local Pack", "Reviews"],
      ["Featured Snippet"],
      ["Image Pack"],
      ["People Also Ask"],
      ["Sitelinks"],
    ][i % 8],
    related: [
      kw + " guide",
      kw + " tools",
      "best " + kw,
      kw + " for beginners",
      kw + " checklist",
    ],
    createdAt: daysAgo(90 - i),
  }));
  await db.collection("keywords").insertMany(kwDocs);

  // Analytics daily (400 days)
  const daily = [];
  for (let i = 399; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dow = d.getDay();
    const growth = 1 + (399 - i) * 0.0042;
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const noise = 0.88 + ((i * 7919) % 100) / 400;
    const views = Math.round(3200 * growth * weekend * noise);
    const organic = Math.round(views * 0.66);
    daily.push({
      id: uuidv4(),
      date: d.toISOString().slice(0, 10),
      views,
      organic,
      engagement: Math.round(views * (0.32 + ((i * 31) % 10) / 100)),
      conversions: Math.round(organic * 0.024),
      impressions: Math.round(organic * 13.5),
      clicks: organic,
      avgPosition: +(14 - (399 - i) * 0.012 + ((i * 13) % 7) / 10).toFixed(1),
    });
  }
  await db.collection("analytics_daily").insertMany(daily);

  // Activity
  const acts = [];
  const actDefs = [
    [
      "Ayushi Sharma",
      "published",
      "blog",
      "Digital Marketing Strategies to Scale Your Business",
      "success",
    ],
    [
      "Neha Verma",
      "updated_seo_title",
      "blog",
      "Core Web Vitals: A Practical Guide",
      "success",
    ],
    ["Rahul Gupta", "uploaded", "media", "seo-guide.webp", "success"],
    [
      "Priya Nair",
      "created",
      "blog",
      "Voice Search Optimization draft",
      "success",
    ],
    [
      "Vikram Singh",
      "approved",
      "blog",
      "Link Building Strategies That Actually Work",
      "success",
    ],
    [
      "Neha Verma",
      "changed_status",
      "blog",
      "SEO for SaaS — moved to In Review",
      "success",
    ],
    [
      "Rahul Gupta",
      "updated",
      "keyword",
      "technical SEO audit — position 4 (+3)",
      "success",
    ],
    [
      "Anjali Patel",
      "created",
      "blog",
      "International SEO: Hreflang Tags Made Simple",
      "success",
    ],
    [
      "Ayushi Sharma",
      "invited",
      "user",
      "sneha@seostudio.io as Viewer",
      "success",
    ],
    [
      "Karan Malhotra",
      "updated",
      "settings",
      "Publishing settings — approval required ON",
      "success",
    ],
    [
      "Neha Verma",
      "scheduled",
      "blog",
      "AI in SEO — scheduled publish",
      "success",
    ],
    [
      "Priya Nair",
      "updated",
      "blog",
      "Content Optimization tactics — meta description rewritten",
      "success",
    ],
    [
      "Vikram Singh",
      "archived",
      "blog",
      "PPC vs SEO comparison 2022",
      "success",
    ],
    ["Rahul Gupta", "deleted", "media", "old-banner-final-v1.png", "success"],
    [
      "Neha Verma",
      "resolved",
      "seo_issue",
      "Missing meta description on 2 blogs",
      "success",
    ],
    [
      "Sneha Iyer",
      "exported",
      "analytics",
      "Traffic report — last 90 days",
      "success",
    ],
  ];
  actDefs.forEach((a, i) =>
    acts.push({
      id: uuidv4(),
      user: a[0],
      action: a[1],
      resourceType: a[2],
      resource: a[3],
      status: a[4],
      ip: "103.21.58." + (10 + i),
      device:
        i % 3 === 0
          ? "Chrome · macOS"
          : i % 3 === 1
            ? "Safari · iOS"
            : "Chrome · Windows",
      createdAt: daysAgo(i * 0.6),
    }),
  );
  await db.collection("activity").insertMany(acts);

  // Notifications
  const notes = [
    {
      type: "review",
      title: "Blog requires SEO review",
      message:
        "Link Building Strategies That Actually Work was submitted for review by Rahul Gupta.",
      link: null,
      read: false,
      createdAt: daysAgo(0.1),
    },
    {
      type: "schedule",
      title: "Scheduled publish approaching",
      message:
        "AI in SEO will publish automatically in 3 days at 10:00 AM IST.",
      link: null,
      read: false,
      createdAt: daysAgo(0.3),
    },
    {
      type: "seo",
      title: "Meta description is missing",
      message: "Voice Search Optimization is missing its meta description.",
      link: null,
      read: false,
      createdAt: daysAgo(0.6),
    },
    {
      type: "team",
      title: "New team member joined",
      message: "Sneha Iyer accepted the invitation as Viewer.",
      link: null,
      read: true,
      createdAt: daysAgo(1.2),
    },
    {
      type: "publish",
      title: "Blog published successfully",
      message: "E-E-A-T Explained is now live on the website.",
      link: null,
      read: true,
      createdAt: daysAgo(2),
    },
    {
      type: "seo",
      title: "3 SEO issues detected",
      message: "Weekly crawl found missing alt text and a duplicate title.",
      link: null,
      read: true,
      createdAt: daysAgo(3.1),
    },
    {
      type: "keyword",
      title: "Keyword entered top 5",
      message: "technical SEO audit moved from #7 to #4.",
      link: null,
      read: true,
      createdAt: daysAgo(4),
    },
    {
      type: "publish",
      title: "Blog published successfully",
      message: "Local SEO Playbook is now live.",
      link: null,
      read: true,
      createdAt: daysAgo(6),
    },
  ];
  await db
    .collection("notifications")
    .insertMany(notes.map((n) => ({ id: uuidv4(), ...n })));

  // Settings
  await db.collection("settings").insertOne({
    id: "app-settings",
    general: {
      siteName: "SEO Studio",
      tagline: "Content & SEO operations for modern teams",
      timezone: "Asia/Kolkata",
      language: "English",
      logoUrl: "",
    },
    seo: {
      defaultMetaTitle: "",
      defaultMetaDescription: "",
      defaultOgImage: "",
      sitemapEnabled: true,
      robotsTxt:
        "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
      gaProperty: "G-SEOSTUDIO1",
      gscVerified: true,
    },
    publishing: {
      requireApproval: true,
      autoPublishScheduled: true,
      checklistEnabled: true,
      defaultStatus: "draft",
    },
  });

  globalThis.__seoStudioSeeded = true;
}
