"use client";

import { useState } from "react";

/**
 * ExpandableText renders a product description clamped to two lines with a
 * accent "Leer más" / "Leer menos" toggle, matching the storefront.s
 * "Read more" affordance. Purely visual state; no data leaves the component.
 */
export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`text-sm leading-relaxed text-text-muted ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-sm font-medium text-action"
      >
        {expanded ? "Leer menos" : "Leer más"}
      </button>
    </div>
  );
}
