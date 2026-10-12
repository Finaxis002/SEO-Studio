
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  fetchIconifyIcons,
  searchIconifyIcons,
  iconDataToSvgUrl,
} from "@/lib/iconify";

import { searchEmojis } from "@/lib/emoji";

const DEFAULT_ICONS = [
  "mdi:rocket-launch",
  "mdi:file-document-outline",
  "mdi:package-variant-closed",
  "mdi:account-group",
  "mdi:cash-multiple",
  "mdi:truck-delivery-outline",
  "mdi:gift-outline",
  "mdi:chart-box-outline",
  "mdi:cog-outline",
  "mdi:lock-outline",
  "mdi:lightbulb-outline",
  "mdi:calculator",
  "mdi:tag-outline",
  "mdi:credit-card-outline",
  "mdi:cart-outline",
];

export default function IconifyPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState(DEFAULT_ICONS);
  const [iconData, setIconData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emojis, setEmojis] = useState([]);
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [emojiError, setEmojiError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIcons() {
      try {
        const names = query.trim()
          ? await searchIconifyIcons(query, 60)
          : DEFAULT_ICONS;

        if (cancelled) return;

        setIcons(names);

        const data = await fetchIconifyIcons(names);

        if (!cancelled) {
          setIconData((previous) => ({ ...previous, ...data }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load icons.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    setError("");
    setIcons([]);

    const timer = setTimeout(loadIcons, query.trim() ? 150 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    if (!value || !value.includes(":") || iconData[value]) return;

    fetchIconifyIcons([value])
      .then((data) => {
        if (!cancelled) {
          setIconData((previous) => ({ ...previous, ...data }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to load the selected icon.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, iconData]);


  useEffect(() => {
  let cancelled = false;

    setEmojis([]);
    setEmojiError("");

    if (!query.trim()) {
      setEmojiLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setEmojiLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchEmojis(query);

        if (!cancelled) {
          setEmojis(results);
        }
      } catch (error) {
        if (!cancelled) {
          setEmojiError(error.message || "Unable to load emojis.");
        }
      } finally {
        if (!cancelled) {
          setEmojiLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="min-w-0 space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search icons or emojis, e.g. rocket, users, money..."
        aria-label="Search icons and emojis"
      />

      {/* EMOJI RESULTS */}
      {query.trim() && (
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Emojis
          </p>

          {emojiLoading && (
            <p className="text-xs text-muted-foreground" role="status">
              Loading emojis...
            </p>
          )}

          {emojiError && (
            <p className="text-xs text-destructive" role="alert">
              {emojiError}
            </p>
          )}

          {!emojiLoading && !emojiError && emojis.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No emojis found.
            </p>
          )}

          <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-6">
            {emojis.map((item, index) => {
              const selected = value === item.emoji;

              return (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  title={item.name}
                  aria-label={`Select emoji ${item.name}`}
                  aria-pressed={selected}
                  onClick={() => onChange(item.emoji)}
                  className={`flex h-11 items-center justify-center rounded-lg border text-2xl transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ICONIFY ICON RESULTS */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Icons
        </p>

        <div
          className="grid max-h-48 grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-6"
          aria-label="Available icons"
        >
          {icons.map((id) => {
            const selected = value === id;
            const src = iconDataToSvgUrl(iconData[id]);

            return (
              <button
                key={id}
                type="button"
                title={id}
                aria-label={`Select ${id}`}
                aria-pressed={selected}
                onClick={() => onChange(id)}
                className={`flex h-11 items-center justify-center rounded-lg border transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-6 dark:brightness-0 dark:invert"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {loading ? "…" : "?"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground" role="status">
          Loading icons...
        </p>
      )}

      {!loading && icons.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No matching icons found.
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {value && (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary bg-primary/10 ring-1 ring-primary"
          role="img"
          aria-label="Selected category icon"
          title="Selected category icon"
        >
          {value.includes(":") ? (
            iconDataToSvgUrl(iconData[value]) ? (
              <img
                src={iconDataToSvgUrl(iconData[value])}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 dark:brightness-0 dark:invert"
              />
            ) : (
              <span className="text-xs text-muted-foreground" aria-hidden="true">
                {loading ? "…" : "?"}
              </span>
            )
          ) : (
            <span className="text-2xl" aria-hidden="true">
              {value}
            </span>
          )}
        </div>
      )}
    </div>
  );

}
