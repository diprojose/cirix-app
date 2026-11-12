import type { ReactNode, SVGProps } from "react";
import type { StampIconName } from "@/modules/card-design/domain/card-design";

/*
 * The gallery of pictures a visit can leave on the card, for businesses without
 * their own. Bold outlines on a 24px grid so they read at stamp size, in one
 * colour (`currentColor`) so they take the card's colours.
 */

const SHAPES: Record<StampIconName, ReactNode> = {
  star: <path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8Z" fill="currentColor" />,
  coffee: (
    <>
      <path d="M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5Z" fill="currentColor" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" />
      <path d="M4 21h13" />
    </>
  ),
  burger: (
    <>
      <path d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6Z" fill="currentColor" />
      <path d="M3.5 13.5h17" strokeWidth={2.4} />
      <path d="M4.5 16.5h15v1A2.5 2.5 0 0 1 17 20H7a2.5 2.5 0 0 1-2.5-2.5Z" fill="currentColor" />
    </>
  ),
  pizza: (
    <>
      <path d="M3.5 6.5C9 3.8 15 3.8 20.5 6.5L12 21Z" fill="currentColor" fillOpacity={0.35} />
      <path d="M3.5 6.5C9 3.8 15 3.8 20.5 6.5" strokeWidth={2.6} />
      <circle cx="10" cy="9.5" r="1.4" fill="currentColor" />
      <circle cx="14" cy="11.5" r="1.4" fill="currentColor" />
      <circle cx="11.5" cy="14.5" r="1.2" fill="currentColor" />
    </>
  ),
  taco: (
    <>
      <path d="M3 17a9 9 0 0 1 18 0Z" fill="currentColor" />
      <path d="M6 10.5c.5-1.5 1.8-2 2.5-1M10.5 8c.7-1.3 2.3-1.3 3 0M15.5 9.5c.7-1 2-.5 2.5 1" />
    </>
  ),
  icecream: (
    <>
      <circle cx="12" cy="8" r="4.5" fill="currentColor" />
      <path d="M7.5 11.5 12 21l4.5-9.5" fill="currentColor" fillOpacity={0.35} />
    </>
  ),
  cupcake: (
    <>
      <path d="M5.5 13h13l-1.5 7h-10Z" fill="currentColor" fillOpacity={0.35} />
      <path d="M5 13a3 3 0 0 1 1.5-5.5A5.5 5.5 0 0 1 17.5 7.5 3 3 0 0 1 19 13Z" fill="currentColor" />
      <circle cx="12" cy="3.5" r="1.3" fill="currentColor" />
    </>
  ),
  bread: (
    <>
      <path d="M5 11a4 4 0 0 1 2-7.5h10A4 4 0 0 1 19 11v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19Z" fill="currentColor" fillOpacity={0.35} />
      <path d="M5 11a4 4 0 0 1 2-7.5h10A4 4 0 0 1 19 11v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19Z" />
      <path d="M9.5 9.5 11 8M13 12.5l1.5-1.5" />
    </>
  ),
  drink: (
    <>
      <path d="M4.5 4h15L12 12.5Z" fill="currentColor" />
      <path d="M12 12.5V20M8 20.5h8" />
    </>
  ),
  beer: (
    <>
      <path d="M5.5 7h10v11.5A2.5 2.5 0 0 1 13 21H8a2.5 2.5 0 0 1-2.5-2.5Z" fill="currentColor" />
      <path d="M15.5 9.5H17a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.5" />
      <path d="M5.5 6.5a2.5 2.5 0 0 1 4-2.3 2.5 2.5 0 0 1 4 0 2.3 2.3 0 0 1 2 2.3" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10C19.5 15.5 12 20 12 20Z" fill="currentColor" />,
  leaf: (
    <>
      <path d="M5 19C4 11 9 4.5 20 4c.5 10-5 16-15 15Z" fill="currentColor" />
      <path d="M5 19 13 11" stroke="var(--stamp-cut, transparent)" />
    </>
  ),
};

export const STAMP_ICON_LABELS: Record<StampIconName, { es: string; en: string }> = {
  star: { es: "Estrella", en: "Star" },
  coffee: { es: "Café", en: "Coffee" },
  burger: { es: "Hamburguesa", en: "Burger" },
  pizza: { es: "Pizza", en: "Pizza" },
  taco: { es: "Taco", en: "Taco" },
  icecream: { es: "Helado", en: "Ice cream" },
  cupcake: { es: "Postre", en: "Cupcake" },
  bread: { es: "Pan", en: "Bread" },
  drink: { es: "Cóctel", en: "Cocktail" },
  beer: { es: "Cerveza", en: "Beer" },
  heart: { es: "Corazón", en: "Heart" },
  leaf: { es: "Hoja", en: "Leaf" },
};

export function StampIcon({ name, ...props }: { name: StampIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {SHAPES[name]}
    </svg>
  );
}
