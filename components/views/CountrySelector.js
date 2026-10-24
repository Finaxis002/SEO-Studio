"use client";

import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { COUNTRIES, getCountry, searchCountries } from "@/lib/countries";

/**
 * Real flag image component from FlagCDN (clean, fast, official country flags).
 */
export function CountryFlag({ code, size = 18, className = "" }) {
  if (!code || code === "all" || code === "global") {
    return <Globe className="text-violet-600 shrink-0" style={{ width: size, height: size }} />;
  }
  const cleanCode = String(code).toLowerCase().trim();
  const height = Math.round(size * 0.72);
  return (
    <img
      src={`https://flagcdn.com/w40/${cleanCode}.png`}
      srcSet={`https://flagcdn.com/w80/${cleanCode}.png 2x`}
      width={size}
      height={height}
      alt={code}
      style={{
        width: size,
        height,
        borderRadius: 2,
        objectFit: "cover",
        display: "inline-block",
        flexShrink: 0,
      }}
      className={`border border-black/15 shadow-2xs ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Clean, simple CountrySelector with REAL country flags (FlagCDN), instant code search,
 * and zero text truncation.
 */
export default function CountrySelector({
  value = "global",
  onChange,
  isFilter = false,
  className = "",
  buttonClassName = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(() => {
    if (isFilter && (!value || value === "all")) {
      return {
        code: "all",
        slug: "all",
        name: "All Countries",
      };
    }
    return getCountry(value);
  }, [value, isFilter]);

  const filtered = useMemo(() => {
    return searchCountries(search);
  }, [search]);

  // Exclude 'global' from list so it doesn't duplicate with top option
  const countryList = useMemo(() => {
    return filtered.filter((c) => c.code !== "global");
  }, [filtered]);

  const handleSelect = (c) => {
    if (onChange) {
      if (isFilter && c.code === "all") {
        onChange("", c);
      } else {
        onChange(c.code, c);
      }
    }
    setOpen(false);
    setSearch("");
  };

  const isSelected = (c) => {
    if (isFilter && c.code === "all") {
      return !value || value === "all";
    }
    return value === c.code || value === c.slug || (!value && c.code === "global");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full h-9 justify-between font-normal text-left px-2.5 text-xs sm:text-[13px] border-input bg-muted/30 hover:bg-accent/40 transition-colors ${buttonClassName} ${className}`}
        >
          <span className="flex items-center gap-2 min-w-0 truncate">
            <CountryFlag code={selected.code} size={18} />
            <span className="truncate font-medium text-foreground">
              {selected.name}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60 ml-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[290px] sm:min-w-[310px] p-0 shadow-xl border-border bg-popover rounded-xl overflow-hidden z-50"
        align="start"
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-border/70 px-3 py-2 gap-2 bg-muted/20">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search country or dial (e.g. India, +91, 971, IN)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Clean Single List with Real Flags & Dial Codes */}
        <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-0.5">
          {/* Top Single Option: "All Countries" for filter, or "Global" for editor */}
          {!search && (
            <button
              type="button"
              onClick={() =>
                handleSelect(
                  isFilter
                    ? { code: "all", slug: "all", name: "All Countries" }
                    : { code: "global", slug: "global", name: "Global" }
                )
              }
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                isSelected({ code: isFilter ? "all" : "global" })
                  ? "bg-violet-50 text-violet-700 font-bold dark:bg-violet-950/50 dark:text-violet-300"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="font-medium">
                  {isFilter ? "All Countries" : "Global"}
                </span>
              </span>
              {isSelected({ code: isFilter ? "all" : "global" }) && (
                <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />
              )}
            </button>
          )}

          {/* Countries with Real Flags and Dial Codes */}
          {countryList.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No country found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            countryList.map((c) => {
              const active = isSelected(c);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    active
                      ? "bg-violet-50 text-violet-700 font-bold dark:bg-violet-950/50 dark:text-violet-300"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <CountryFlag code={c.code} size={18} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground/80 bg-muted/60 px-1 py-0.5 rounded border border-border/60">
                      {c.code}
                    </span>
                    {c.dial && (
                      <span className="text-[11px] font-mono text-muted-foreground min-w-[34px] text-right">
                        {c.dial}
                      </span>
                    )}
                    {active && (
                      <Check className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
