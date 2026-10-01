import axios from "axios";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Translates a single plain-text string into the target language.
 * Primary: Google Translate GTX endpoint
 * Fallback: MyMemory Translation API
 */
export async function translateSingleText(text, targetLang, sourceLang = "en") {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (
    !trimmed ||
    /^[\d\s.,\/#!$%\^&\*;:{}=\-_`~()@+?><\[\]'"]+$/.test(trimmed)
  ) {
    return text;
  }

  const leadingSpace = text.match(/^\s*/)?.[0] || "";
  const trailingSpace = text.match(/\s*$/)?.[0] || "";

  // 1. Try Google Translate clients5 endpoint (fast, zero rate limits)
  try {
    const res = await axios.get("https://clients5.google.com/translate_a/t", {
      params: {
        client: "dict-chrome-ex",
        sl: sourceLang,
        tl: targetLang,
        q: trimmed,
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });
    if (res.data) {
      const translated = Array.isArray(res.data) ? res.data[0] : res.data;
      if (translated && typeof translated === "string") {
        return leadingSpace + translated + trailingSpace;
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Try Google Translate GTX Endpoint
  try {
    const res = await axios.get(
      "https://translate.googleapis.com/translate_a/single",
      {
        params: {
          client: "gtx",
          sl: sourceLang,
          tl: targetLang,
          dt: "t",
          q: trimmed,
        },
        timeout: 10000,
      }
    );
    if (res.data && Array.isArray(res.data[0])) {
      const translated = res.data[0].map((x) => x[0]).join("");
      if (translated) {
        return leadingSpace + translated + trailingSpace;
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 3. Fallback to MyMemory Public API
  try {
    const res = await axios.get("https://api.mymemory.translated.net/get", {
      params: {
        q: trimmed,
        langpair: `${sourceLang}|${targetLang}`,
      },
      timeout: 10000,
    });
    const match = res.data?.responseData?.translatedText;
    if (match && typeof match === "string" && !match.includes("MYMEMORY WARNING")) {
      return leadingSpace + match + trailingSpace;
    }
  } catch (err) {
    // Return original if both fail
  }

  return text;
}

/**
 * Parses HTML into tag tokens and text tokens, translating only text tokens.
 * This guarantees 100% preservation of all HTML elements (tables, images, styles, ids, classes).
 */
export async function translateHtml(html, targetLang, sourceLang = "en") {
  if (!html || typeof html !== "string") return html;

  const tokens = [];
  let currentIndex = 0;
  // Match tags (<...>), self-closing tags, comments
  const tagRegex = /<[^>]+>/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const textBeforeTag = html.substring(currentIndex, match.index);
    if (textBeforeTag.length > 0) {
      tokens.push({ type: "text", content: textBeforeTag });
    }
    tokens.push({ type: "tag", content: match[0] });
    currentIndex = tagRegex.lastIndex;
  }

  const remainingText = html.substring(currentIndex);
  if (remainingText.length > 0) {
    tokens.push({ type: "text", content: remainingText });
  }

  // Extract meaningful text tokens to translate
  const textTokens = tokens.filter(
    (t) => t.type === "text" && t.content.trim().length > 0
  );
  if (textTokens.length === 0) return html;

  // Deduplicate strings to minimize network requests
  const uniqueTexts = Array.from(
    new Set(textTokens.map((t) => t.content.trim()))
  );
  const cache = new Map();

  // Concurrency-controlled translation (batches of 5)
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
    const chunk = uniqueTexts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (str) => {
        const translated = await translateSingleText(str, targetLang, sourceLang);
        cache.set(str, translated.trim());
      })
    );
    await sleep(40); // Gentle 40ms delay
  }

  // Rebuild the HTML with identical markup
  let resultHtml = "";
  for (const token of tokens) {
    if (token.type === "tag") {
      resultHtml += token.content;
    } else {
      const trimmed = token.content.trim();
      if (!trimmed || !cache.has(trimmed)) {
        resultHtml += token.content;
      } else {
        const leading = token.content.match(/^\s*/)?.[0] || "";
        const trailing = token.content.match(/\s*$/)?.[0] || "";
        resultHtml += leading + cache.get(trimmed) + trailing;
      }
    }
  }

  return resultHtml;
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "hi", label: "हिंदी", nativeName: "Hindi" },
  { code: "mr", label: "मराठी", nativeName: "Marathi" },
  { code: "gu", label: "ગુજરાતી", nativeName: "Gujarati" },
  { code: "ta", label: "தமிழ்", nativeName: "Tamil" },
  { code: "te", label: "తెలుగు", nativeName: "Telugu" },
  { code: "kn", label: "ಕನ್ನಡ", nativeName: "Kannada" },
  { code: "bn", label: "বাংলা", nativeName: "Bengali" },
];

export const DEFAULT_TARGET_LANGS = ["hi", "mr", "gu", "ta", "te", "kn", "bn"];

/**
 * Translates a complete blog object into specified target languages.
 * Preserves existing translations and merges new ones.
 */
export async function translateBlog(blog, targetLangs = DEFAULT_TARGET_LANGS) {
  if (!blog) throw new Error("Blog object is required");

  const existingTranslations = blog.translations || {};
  const newTranslations = { ...existingTranslations };

  // Process 2 languages at a time for fast concurrency without overwhelming sockets
  for (let i = 0; i < targetLangs.length; i += 2) {
    const chunk = targetLangs.slice(i, i + 2);
    await Promise.all(
      chunk.map(async (lang) => {
        const [translatedTitle, translatedExcerpt, translatedContent] = await Promise.all([
          blog.title ? translateSingleText(blog.title, lang) : "",
          blog.excerpt ? translateSingleText(blog.excerpt, lang) : "",
          blog.contentHtml ? translateHtml(blog.contentHtml, lang) : "",
        ]);

        newTranslations[lang] = {
          title: translatedTitle.trim(),
          excerpt: translatedExcerpt.trim(),
          contentHtml: translatedContent,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }

  return newTranslations;
}

