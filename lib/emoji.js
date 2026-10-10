
const EMOJI_API = "https://emojihub.yurace.pro/api";

export async function searchEmojis(query) {
  const term = query.trim();

  if (!term) return [];

  const response = await fetch(
    `${EMOJI_API}/search?q=${encodeURIComponent(term)}`
  );

  if (!response.ok) {
    throw new Error(`Emoji search failed (${response.status})`);
  }

  const data = await response.json();

  return data
    .map((item) => ({
      emoji: (item.unicode || [])
        .map((code) =>
          parseInt(code.replace("U+", ""), 16)
        )
        .filter(Number.isFinite)
        .map((code) => String.fromCodePoint(code))
        .join(""),
      name: item.name || term,
      category: item.category || "emoji",
    }))
    .filter((item) => item.emoji);
}
