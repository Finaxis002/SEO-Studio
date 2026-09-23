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

export async function generateOutline(input) {
  const prompt = `Create an SEO content outline as JSON only. Topic keyword: ${input.keyword}. Content type: ${input.contentType || "Guide"}. Search intent: ${input.intent || "Informational"}. Target word count: ${input.wordCount || 1200}.
Return exactly this shape: {"h1":"string","h2s":[{"h2":"string","h3s":["string"]}],"questions":["string"],"relatedKeywords":["string"],"wordCountTarget":number}. Use 4-6 h2 sections and practical, specific headings. Do not include markdown or commentary.`;
  return callGemini(prompt, 0.4);
}

export async function generateSeoMeta(input) {
  const cleanText = String(input.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);

  const prompt = `You are a world-class SEO copywriter. Generate high-CTR, Google-optimized metadata as JSON only.
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

  const failingList = Array.isArray(input.failingChecks) && input.failingChecks.length > 0
    ? input.failingChecks.join("; ")
    : "None (maximize ranking potential and CTR)";

  const existingBlogsSummary = Array.isArray(input.existingBlogs) && input.existingBlogs.length > 0
    ? input.existingBlogs.slice(0, 20).map(b => `- "${b.title}" (slug: ${b.slug}${b.keyword ? `, keyword: ${b.keyword}` : ""})`).join("\n")
    : "None available";

  const prompt = `You are a world-class SEO strategist and copy editor.
Analyze the following blog information and provide an aligned, high-ranking SEO suggestion package specifically designed to BOOST the SEO score to 95-100/100 by fixing any failing checks (including internal links).

Current Blog Title: "${input.title || ""}"
Current Focus Keyword: "${input.keyword || ""}"
Current URL Slug: "${input.slug || ""}"
Current SEO Score: ${input.currentScore !== undefined ? input.currentScore + "/100" : "Not calculated"}
Failing SEO Checks to Fix: ${failingList}
Current Content Snippet: "${cleanText}"

Existing Published Blogs on Site (Choose 1 best match for internal linking):
${existingBlogsSummary}

Requirements to guarantee 100/100 SEO Score:
1. "focusKeyword": 2-4 words, high search-intent target keyword. If user provided a keyword, refine it or keep it; if blank, extract the most competitive keyword from title/content.
2. "seoTitle": 45 to 60 characters long (ideal for Google SERP snippets). MUST naturally include the "focusKeyword", preferably near the beginning, with high click-through appeal.
3. "slug": Clean, lowercase, hyphen-separated slug (e.g. "complete-tax-saving-guide-2025") that includes the "focusKeyword".
4. "introParagraph": 2 to 3 sentences opening paragraph. MUST naturally include the exact "focusKeyword" within the first paragraph so the SEO intro check passes. If current content exists, adapt its opening paragraph; if not, write a compelling intro hook.
5. "metaDescription": 125 to 155 characters long, active voice, includes "focusKeyword", compelling CTA without being truncated.
6. "secondaryKeywords": 3 to 5 relevant secondary/long-tail keywords as an array of strings.
7. "reasoning": 1 brief sentence explaining how these suggestions resolve failing checks and boost the SEO score.
8. "internalLink": If existing blogs are listed above, choose the 1 most topic-relevant blog. Create a natural transition sentence that links to it using an HTML anchor tag (<a href="/blog/slug">anchor text</a>). If no existing blogs, return null.

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

