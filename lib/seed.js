import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./auth.js";

const CATEGORIES = [
  "GST & Taxation",
  "Invoicing & Billing",
  "Inventory Management",
  "Accounting & Finance",
  "Business Growth",
  "Compliance & Tax Law",
];

const SUBCATEGORIES = [
  "Guides",
  "Tutorials",
  "Updates",
  "Compliance",
  "Case Studies",
  "Best Practices",
  "Checklists",
  "Tax Slabs",
];

export const WORKSPACE_OPTIONS = {
  departments: [
    "Accounting",
    "Tax & GST",
    "Operations",
    "Product",
    "Support",
    "Leadership",
  ],
  timezones: ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"],
  languages: ["English", "Hindi"],
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

export const ROLES = [
  {
    id: "role-super-admin",
    name: "Super Admin",
    slug: "super-admin",
    description: "Unrestricted access to every part of the workspace.",
    isCustom: false,
    permissions: [...ALL_PERMS],
  },
  {
    id: "role-admin",
    name: "Admin",
    slug: "admin",
    description: "Manages users, permissions, content and settings.",
    isCustom: false,
    permissions: [...ALL_PERMS],
  },
  {
    id: "role-seo-manager",
    name: "SEO Manager",
    slug: "seo-manager",
    description: "Approves content, publishes, schedules and owns SEO strategy.",
    isCustom: false,
    permissions: [
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
    ],
  },
  {
    id: "role-seo-executive",
    name: "SEO Executive",
    slug: "seo-executive",
    description: "Optimizes content, manages keywords and submits for approval.",
    isCustom: false,
    permissions: [
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
    ],
  },
  {
    id: "role-content-writer",
    name: "Content Writer",
    slug: "content-writer",
    description: "Writes and edits own drafts, uploads images, edits metadata.",
    isCustom: false,
    permissions: [
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "seo.view",
      "seo.edit",
      "media.view",
      "media.upload",
      "media.edit",
    ],
  },
  {
    id: "role-editor",
    name: "Editor",
    slug: "editor",
    description: "Reviews, approves, publishes and schedules content.",
    isCustom: false,
    permissions: [
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
    ],
  },
  {
    id: "role-viewer",
    name: "Viewer",
    slug: "viewer",
    description: "Read-only access to content and analytics.",
    isCustom: false,
    permissions: [
      "blogs.view",
      "seo.view",
      "media.view",
      "analytics.view",
      "team.view",
    ],
  },
];

export async function ensureSeeded(db) {
  if (globalThis.__seoStudioSeeded) return;

  const passwordHash = hashPassword(
    process.env.SEED_USER_PASSWORD || "ChangeMe123!",
  );

  // 1. Permission Catalog
  if ((await db.collection("permission_catalog").countDocuments()) === 0) {
    await db
      .collection("permission_catalog")
      .insertOne({ id: "default", groups: DEFAULT_PERMISSIONS });
  }

  // 2. Roles
  const existingRoles = await db.collection("roles").countDocuments();
  if (existingRoles === 0) {
    await db.collection("roles").insertMany(ROLES.map((r) => ({ ...r })));
  }

  // 3. Workspace Config (Categories, Departments)
  await db
    .collection("workspace_config")
    .updateOne(
      { id: "default" },
      { $setOnInsert: { id: "default", ...WORKSPACE_OPTIONS } },
      { upsert: true },
    );

  // 4. Initial Admin (only if team collection is completely empty)
  const teamCount = await db.collection("team").countDocuments();
  if (teamCount === 0) {
    await db.collection("team").insertOne({
      id: "admin-super",
      name: "Super Admin",
      email: process.env.SEED_USER_EMAIL || "admin01@gmail.com",
      role: "Super Admin",
      department: "Leadership",
      status: "active",
      blogsCreated: 0,
      blogsPublished: 0,
      lastActive: "Just now",
      joinedAt: new Date().toISOString().slice(0, 10),
      permissions: [],
      passwordHash,
    });
  }

  // 5. Settings
  const existingSettings = await db
    .collection("settings")
    .findOne({ id: "app-settings" });
  if (!existingSettings) {
    await db.collection("settings").insertOne({
      id: "app-settings",
      general: {
        siteName: "Vinimay",
        tagline: "Smart Cloud Billing & GST Accounting for Indian Businesses",
        timezone: "Asia/Kolkata",
        language: "English",
        logoUrl: "",
      },
      seo: {
        defaultMetaTitle: "Vinimay - Cloud Billing & GST Accounting Software",
        defaultMetaDescription:
          "Streamline invoicing, e-way bills, GST compliance, and inventory management with Vinimay.",
        defaultOgImage: "",
        sitemapEnabled: true,
        robotsTxt:
          "User-agent: *\nAllow: /\nSitemap: https://vinimay.sharda.co.in/sitemap.xml",
        gaProperty: process.env.GA4_PROPERTY_ID || "",
        gscVerified: true,
      },
      publishing: {
        requireApproval: false,
        autoPublishScheduled: true,
        checklistEnabled: true,
        defaultStatus: "draft",
      },
    });
  }

  globalThis.__seoStudioSeeded = true;
}
