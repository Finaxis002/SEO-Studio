// Shared SEO analysis engine (used by both server and client)

export function slugify(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .replace(/['\"']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripTags(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let idx = 0,
    count = 0;
  const h = haystack.toLowerCase(),
    n = needle.toLowerCase();
  while ((idx = h.indexOf(n, idx)) !== -1) {
    count++;
    idx += n.length;
  }
  return count;
}

export function analyzeSeo(blog, publishedSlugs = null) {
  const html = blog.contentHtml || "";
  const text = stripTags(html);
  const words = text ? text.split(/\s+/).length : 0;
  const seo = blog.seo || {};
  const kw = (seo.focusKeyword || "").toLowerCase().trim();
  const title = seo.metaTitle || blog.title || "";
  const slug = blog.slug || "";
  const metaDesc = seo.metaDescription || "";
  const lowerText = text.toLowerCase();
  const density = kw
    ? (countOccurrences(lowerText, kw) / Math.max(words, 1)) * 100
    : 0;
  const imgs = [...html.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
  const missingAlt = imgs.filter(
    (t) => !/alt\s*=\s*["'][^"']+['"]/i.test(t),
  ).length;
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)['"]/gi)].map(
    (m) => m[1],
  );
  const internal = hrefs.filter(
    (h) =>
      h.startsWith("/") ||
      h.startsWith("#") ||
      h.includes("vinimay.sharda.co.in"),
  );
  const external = hrefs.filter(
    (h) => /^https?:\/\//i.test(h) && !h.includes("vinimay.sharda.co.in"),
  );

  // Validate internal blog links against known published slugs if provided
  let brokenInternal = [];
  if (Array.isArray(publishedSlugs) && publishedSlugs.length > 0) {
    const slugSet = new Set(publishedSlugs.map((s) => s.toLowerCase().trim()));
    brokenInternal = internal.filter((h) => {
      const isBlog =
        /^\/(?:blogs|blog)\//i.test(h) ||
        /https?:\/\/vinimay\.sharda\.co\.in\/(?:blogs|blog)\//i.test(h);
      if (isBlog) {
        const linkSlug = h
          .replace(/^https?:\/\/vinimay\.sharda\.co\.in/i, "")
          .replace(/^\/(?:blogs|blog)\//i, "")
          .replace(/\/$/, "")
          .trim()
          .toLowerCase();
        return !linkSlug || !slugSet.has(linkSlug);
      }
      return false;
    });
  }
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  const firstParaMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const firstPara = stripTags(
    firstParaMatch ? firstParaMatch[1] : text.slice(0, 240),
  );
  const featuredOk = !!(blog.featuredImage && blog.featuredImage.url);
  const featuredAltOk = featuredOk && !!(blog.featuredImage.alt || "").trim();

  const totalImgs = imgs.length + (featuredOk ? 1 : 0);
  const totalMissingAlt = missingAlt + (featuredOk && !featuredAltOk ? 1 : 0);

  const checks = [
    {
      id: "kw-set",
      group: "Keyword",
      label: "Focus keyword defined",
      ok: !!kw,
      warn: false,
      weight: 4,
      value: kw || "Not set",
      fix: "Choose the primary keyword this page should rank for.",
    },
    {
      id: "kw-title",
      group: "Keyword",
      label: "Focus keyword in SEO title",
      ok: !!kw && title.toLowerCase().includes(kw),
      warn: false,
      weight: 8,
      value: kw
        ? title.toLowerCase().includes(kw)
          ? "Found"
          : "Missing"
        : "—",
      fix: kw
        ? 'Add "' + kw + '" to the SEO title.'
        : "Set a focus keyword first.",
    },
    {
      id: "kw-slug",
      group: "Keyword",
      label: "Focus keyword in URL slug",
      ok: !!kw && slug.includes(slugify(kw)),
      warn: false,
      weight: 6,
      value: slug || "—",
      fix: "Include the keyword in the URL slug.",
    },
    {
      id: "kw-intro",
      group: "Keyword",
      label: "Keyword appears in introduction",
      ok: !!kw && firstPara.toLowerCase().includes(kw),
      warn: false,
      weight: 8,
      value: kw
        ? firstPara.toLowerCase().includes(kw)
          ? "Found in first paragraph"
          : "Missing"
        : "—",
      fix: "Mention the keyword naturally within the first paragraph.",
    },
    {
      id: "kw-density",
      group: "Keyword",
      label: "Keyword density between 0.5% and 2.5%",
      ok: !!kw && density >= 0.5 && density <= 2.5,
      warn: !!kw && density > 0 && density < 0.5,
      weight: 6,
      value: density.toFixed(2) + "%",
      fix: "Adjust content length or keyword mentions to land in the ideal range.",
    },
    {
      id: "title-length",
      group: "Metadata",
      label: "SEO title between 30 and 60 characters",
      ok: title.length >= 30 && title.length <= 60,
      warn: title.length > 60,
      weight: 6,
      value: title.length + " / 60",
      fix: "Shorten or expand the SEO title to fit search snippets.",
    },
    {
      id: "meta-set",
      group: "Metadata",
      label: "Meta description written",
      ok: metaDesc.length > 0,
      warn: false,
      weight: 4,
      value: metaDesc.length + " / 160",
      fix: "Write a compelling meta description.",
    },
    {
      id: "meta-length",
      group: "Metadata",
      label: "Meta description between 120 and 160 characters",
      ok: metaDesc.length >= 120 && metaDesc.length <= 160,
      warn:
        metaDesc.length > 160 || (metaDesc.length > 0 && metaDesc.length < 120),
      weight: 8,
      value: metaDesc.length + " / 160",
      fix: "Aim for 120-160 characters so the snippet is not truncated.",
    },
    {
      id: "headings",
      group: "Structure",
      label: "Heading structure uses H2 sections",
      ok: h2 >= 2,
      warn: h2 === 1,
      weight: 6,
      value: h1 + " H1 · " + h2 + " H2",
      fix: "Break the article into at least two H2 sections.",
    },
    {
      id: "word-count",
      group: "Structure",
      label: "Content is 600+ words",
      ok: words >= 600,
      warn: words >= 300 && words < 600,
      weight: 8,
      value: words + " words",
      fix: "Expand the article — long-form content ranks better.",
    },
    {
      id: "img-alt",
      group: "Media",
      label: "All images have alt text",
      ok: totalImgs > 0 && totalMissingAlt === 0,
      warn: totalImgs === 0,
      weight: 8,
      value: totalImgs === 0 ? "No images" : totalMissingAlt + " missing",
      fix: "Describe every image with meaningful alt text.",
    },
    {
      id: "internal-links",
      group: "Links",
      label:
        brokenInternal.length > 0
          ? "Broken internal link detected!"
          : "Internal links added",
      ok: internal.length >= 1 && brokenInternal.length === 0,
      warn: false,
      weight: 7,
      value:
        brokenInternal.length > 0
          ? `${brokenInternal.length} broken (404)`
          : internal.length + " found",
      fix:
        brokenInternal.length > 0
          ? `Fix broken link: "${brokenInternal[0]}" does not exist on Vinimay (will cause 404).`
          : "Link to at least one related article or page on your site.",
    },
    {
      id: "external-links",
      group: "Links",
      label: "External (authoritative) link added",
      ok: external.length >= 1,
      warn: false,
      weight: 5,
      value: external.length + " found",
      fix: "Reference one high-authority external source.",
    },
    {
      id: "featured",
      group: "Media",
      label: "Featured image set",
      ok: featuredOk,
      warn: false,
      weight: 6,
      value: featuredOk ? "Set" : "Missing",
      fix: "Upload a featured image for social sharing and CTR.",
    },
  ];

  const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce(
    (a, c) => a + (c.ok ? c.weight : c.warn ? c.weight * 0.5 : 0),
    0,
  );
  const score = Math.round((earned / totalWeight) * 100);

  return {
    score,
    checks,
    stats: {
      words,
      density: +density.toFixed(2),
      internal: internal.length,
      external: external.length,
      brokenInternal: brokenInternal.length,
      images: imgs.length,
      missingAlt,
      headings: { h1, h2 },
    },
  };
}
