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
