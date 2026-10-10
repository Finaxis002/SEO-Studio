"use client";

import { useEffect, useState } from "react";
import {
  fetchIconifyIcons,
  iconDataToSvgUrl,
} from "@/lib/iconify";

export default function CategoryIcon({ icon, className = "h-6 w-6" }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!icon || !icon.includes(":")) {
      setSrc(null);
      return;
    }

    fetchIconifyIcons([icon])
      .then((data) => {
        if (!cancelled) {
          setSrc(iconDataToSvgUrl(data[icon]));
        }
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [icon]);

  // Keep legacy emoji and other existing values compatible.
  if (!icon || !icon.includes(":")) {
    return <span className={className}>{icon || "📄"}</span>;
  }


  if (!src) {
    return <span className={className} aria-label="Icon loading">📄</span>;
  }

return <img src={src} alt="" aria-hidden="true" className={className} />;
}