
const ICONIFY_API = "https://api.iconify.design";

// Cache icon data so we don't fetch the same icon repeatedly.
const iconCache = new Map();
const searchCache = new Map();

// Search for icons by name.
export async function searchIconifyIcons(query, limit = 60) {
  const term = query.trim().toLowerCase();

  if (!term) return [];

  const cacheKey = `${term}:${limit}`;

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const url =
    `${ICONIFY_API}/search?query=${encodeURIComponent(term)}` +
    `&limit=${limit}`;

  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("Too many requests. Please try again shortly.");
  }

  if (!response.ok) {
    throw new Error(`Iconify search failed (${response.status}).`);
  }

  const data = await response.json();
  const icons = data.icons || [];

  searchCache.set(cacheKey, icons);

  return icons;
}

// Fetch multiple icons from the same collection.
export async function fetchIconifyIcons(iconIds) {
  const uniqueIds = [...new Set(iconIds)].filter(Boolean);
  const result = {};
  const groups = {};

  for (const id of uniqueIds) {
    if (iconCache.has(id)) {
      result[id] = iconCache.get(id);
      continue;
    }

    const separator = id.indexOf(":");

    if (separator < 1) continue;

    const prefix = id.slice(0, separator);
    const name = id.slice(separator + 1);

    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push({ id, name });
  }

  await Promise.all(
    Object.entries(groups).map(async ([prefix, icons]) => {
      const names = icons.map(({ name }) => name).join(",");

      const url =
        `${ICONIFY_API}/${encodeURIComponent(prefix)}.json` +
        `?icons=${encodeURIComponent(names)}`;

      const response = await fetch(url);

      if (response.status === 429) {
        throw new Error("Too many icon requests. Please try again shortly.");
      }

      if (!response.ok) {
        throw new Error(`Iconify icon request failed (${response.status}).`);
      }

      const data = await response.json();

      for (const { id, name } of icons) {
        const icon = data.icons?.[name];

        if (icon) {
          const iconData = { ...icon, prefix, name };
          iconCache.set(id, iconData);
          result[id] = iconData;
        }
      }
    })
  );

  return result;
}

// Create a URL that React can display as an image.
export function iconDataToSvgUrl(iconData) {
  if (!iconData?.body) return null;

  const width = iconData.width || 24;
  const height = iconData.height || 24;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    iconData.body +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
