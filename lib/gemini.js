const DEFAULT_MODELS = [
  process.env.GEMINI_MODEL || "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  "gemini-2.0-flash",
];

function parseJson(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGemini(prompt, temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini is not configured. Set GEMINI_API_KEY.");

  let lastError = null;
  for (const model of DEFAULT_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        const msg = data.error?.message || "Gemini call failed";
        // If high demand or overloaded, try next model
        if (
          response.status === 503 ||
          response.status === 429 ||
          msg.includes("high demand") ||
          msg.includes("overloaded")
        ) {
          lastError = new Error(`Model ${model}: ${msg}`);
          continue;
        }
        throw new Error(msg);
      }
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");
      if (!text) throw new Error("Gemini returned empty response");
      return parseJson(text);
    } catch (err) {
      lastError = err;
      if (
        err.message?.includes("high demand") ||
        err.message?.includes("overloaded")
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error("All Gemini models failed");
}

export const VINIMAY_KNOWLEDGE_BASE = {
  brandDescription:
    "Vinimay is a business accounting and billing software platform designed for small businesses. It helps businesses manage GST invoices, billing, sales, purchases, customers, vendors, inventory, ledgers and business reports in one system.",
  coreCategories: [
    "Free Accounting Software",
    "GST Billing Software",
    "Invoice Software",
    "Small Business Accounting Software",
    "Inventory Management Software",
    "Customer Management Software",
    "Ledger Management Software",
    "Business Reports Software",
  ],
  corePages: [
    {
      path: "/",
      primaryKeyword: "Free Accounting and Billing Software",
      title: "Vinimay - Free Accounting and Billing Software",
    },
    {
      path: "/pricing",
      primaryKeyword: "Accounting Software Pricing",
      title: "Vinimay Pricing Plans",
    },
    {
      path: "/services",
      primaryKeyword: "Accounting Software Services",
      title: "Vinimay Business Services",
    },
    {
      path: "/features",
      primaryKeyword: "Accounting Software Features",
      title: "Vinimay Software Features",
    },
    {
      path: "/about-us",
      primaryKeyword: "Vinimay Accounting Software",
      title: "About Vinimay",
    },
    {
      path: "/free-invoice",
      primaryKeyword: "Free Invoice Software for Small Business",
      title: "Free Invoice Generator",
    },
  ],
};

export async function generateOutline(input) {
  const prompt = `You are a world-class SEO content strategist for Vinimay (a business accounting and billing software for small businesses).
Create an SEO content outline as JSON only. Topic keyword: ${input.keyword}. Content type: ${input.contentType || "Guide"}. Search intent: ${input.intent || "Informational"}. Target word count: ${input.wordCount || 1200}.
Brand context: Vinimay helps small businesses manage GST invoices, inventory, ledgers, and billing.
Return exactly this shape: {"h1":"string","h2s":[{"h2":"string","h3s":["string"]}],"questions":["string"],"relatedKeywords":["string"],"wordCountTarget":number}. Use 4-6 h2 sections and practical, specific headings. Do not include markdown or commentary.`;
  return callGemini(prompt, 0.4);
}

export async function generateSeoMeta(input) {
  const cleanText = String(input.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const prompt = `You are a world-class SEO copywriter for Vinimay (https://vinimay.sharda.co.in), a business accounting and billing software platform for small businesses. Generate high-CTR, Google-optimized metadata as JSON only.
Blog Title: "${input.title || ""}"
Target Keyword: "${input.keyword || ""}"
Article Summary / Content: "${cleanText}"

Requirements:
- metaTitle: 45 to 60 characters long, includes focus keyword naturally, highly compelling.
- metaDescription: 125 to 155 characters long, active voice, clear value proposition with a subtle CTA.
- suggestedKeywords: 3 to 5 relevant secondary keywords as an array of strings.

Return JSON shape: {"metaTitle":"string","metaDescription":"string","suggestedKeywords":["string"]}`;

  return callGemini(prompt, 0.3);
}

export async function suggestSeoAlignment(input) {
  const cleanText = String(input.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const failingList =
    Array.isArray(input.failingChecks) && input.failingChecks.length > 0
      ? input.failingChecks.join("; ")
      : "None (maximize ranking potential and CTR)";

  const existingBlogsSummary =
    Array.isArray(input.existingBlogs) && input.existingBlogs.length > 0
      ? input.existingBlogs
          .slice(0, 20)
          .map(
            (b) =>
              `- "${b.title}" (slug: ${b.slug}${b.keyword ? `, keyword: ${b.keyword}` : ""})`,
          )
          .join("\n")
      : "None available";

  const prompt = `You are a world-class SEO strategist for Vinimay (https://vinimay.sharda.co.in).
VINIMAY BRAND & SEO KNOWLEDGE BASE:
- Brand Definition: ${VINIMAY_KNOWLEDGE_BASE.brandDescription}
- Core Categories: ${VINIMAY_KNOWLEDGE_BASE.coreCategories.join(", ")}
- Official Core Site Target Pages & Primary Keywords:
  * / -> "Free Accounting and Billing Software"
  * /pricing -> "Accounting Software Pricing"
  * /services -> "Accounting Software Services"
  * /features -> "Accounting Software Features"
  * /about-us -> "Vinimay Accounting Software"
  * /free-invoice -> "Free Invoice Software for Small Business"

Analyze the following blog and provide an aligned, high-ranking SEO suggestion package specifically designed to BOOST the SEO score to 95-100/100 by fixing any failing checks.

Current Blog Title: "${input.title || ""}"
Current Focus Keyword: "${input.keyword || ""}"
Current URL Slug: "${input.slug || ""}"
Current SEO Score: ${input.currentScore !== undefined ? input.currentScore + "/100" : "Not calculated"}
Failing SEO Checks to Fix: ${failingList}
Current Content Snippet: "${cleanText}"

Existing Published Blogs on Site:
${existingBlogsSummary}

Requirements to guarantee 100/100 SEO Score:
1. "focusKeyword": CRITICAL RULE: If the blog already has an established focus keyword ("${input.keyword || ""}") and current SEO score is >= 80, DO NOT CHANGE IT! KEEP "${input.keyword || ""}" as "focusKeyword" so body keyword density and heading checks are not ruined. If no keyword is set or score is low, pick a 2-4 word keyword that ALREADY APPEARS multiple times in "Current Content Snippet", never invent a keyword absent from the content.
2. "seoTitle": 45 to 60 characters long (ideal for Google SERP snippets). MUST naturally include "focusKeyword", preferably near the beginning, with high click-through appeal.
3. "slug": Clean, lowercase, hyphen-separated slug (e.g. "free-invoice-software-for-small-business") that includes the "focusKeyword". If current slug already works, keep it or optimize slightly.
4. "introParagraph": 2 to 3 sentences opening hook. MUST naturally include the exact "focusKeyword" within the first paragraph so the SEO intro check passes.
5. "metaDescription": 125 to 155 characters long, active voice, includes "focusKeyword", compelling CTA without being truncated.
6. "secondaryKeywords": 3 to 5 relevant secondary/long-tail keywords as an array of strings.
7. "reasoning": 1 brief sentence explaining how these suggestions resolve failing checks and boost the SEO score.
8. "internalLink": Choose either:
   - The best matching blog from Existing Published Blogs above (using <a href="/blogs/targetSlug">anchor text</a>), OR
   - One of Vinimay's core pages (/services, /features, /pricing, /free-invoice) with its official primary keyword as anchor text (e.g. <a href="/services">accounting software services</a>).
   Create a natural transition sentence incorporating this anchor tag. If neither fits, return null.

Return JSON only with this exact shape:
{
  "focusKeyword": "string",
  "seoTitle": "string",
  "slug": "string",
  "introParagraph": "string",
  "metaDescription": "string",
  "secondaryKeywords": ["string"],
  "reasoning": "string",
  "internalLink": {
    "targetTitle": "string",
    "targetSlug": "string",
    "anchorText": "string",
    "sentence": "string"
  }
}`;

  return callGemini(prompt, 0.3);
}

