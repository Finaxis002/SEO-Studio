const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function parseJson(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function generateOutline(input) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini is not configured. Set GEMINI_API_KEY.");

  const prompt = `Create an SEO content outline as JSON only. Topic keyword: ${input.keyword}. Content type: ${input.contentType || "Guide"}. Search intent: ${input.intent || "Informational"}. Target word count: ${input.wordCount || 1200}.
Return exactly this shape: {"h1":"string","h2s":[{"h2":"string","h3s":["string"]}],"questions":["string"],"relatedKeywords":["string"],"wordCountTarget":number}. Use 4-6 h2 sections and practical, specific headings. Do not include markdown or commentary.`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || "Gemini outline generation failed");
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("");
  if (!text) throw new Error("Gemini returned an empty outline");
  return parseJson(text);
}
