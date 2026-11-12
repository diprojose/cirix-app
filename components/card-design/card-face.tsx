/* eslint-disable @next/next/no-img-element -- card pictures come from our own API, already sized and compressed. */
import type { CSSProperties, ReactNode } from "react";
import type { CardLook } from "@/modules/card-design/application/card-design-use-cases";
import { StampIcon } from "./stamp-icons";

/*
 * The loyalty card as the customer sees it, in the business's colours: its logo
 * and the count at the top, the visits (over the cover photo, if there is one)
 * in the middle, and what the card is for at the bottom. The owner's design
 * screen draws the same card as its preview.
 */

export type CardField = { label: string; value: string };

const mix = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function CardFace({
  look,
  businessName,
  label,
  value,
  fields,
  children,
  className = "",
  ariaLabel,
}: {
  look: CardLook;
  businessName: string;
  /** What the number at the top counts: "Visits", "Points". */
  label: string;
  value: string;
  fields: CardField[];
  /** The middle of the card, such as the visits. Without it, the cover shows on its own. */
  children?: (ink: string) => ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  // Over a photo, white reads on any business colour; the photo gets a shade for it.
  const middleInk = look.coverUrl ? "#ffffff" : look.ink;

  return (
    <section
      aria-label={ariaLabel}
      style={{ backgroundColor: look.color, color: look.ink }}
      className={`overflow-hidden rounded-3xl shadow-[0_1px_3px_rgb(16_24_40/0.14)] ${className}`}
    >
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 pt-5 pb-4">
        {look.logoUrl ? (
          <img src={look.logoUrl} alt={businessName} className="h-11 max-w-[60%] object-contain object-left" />
        ) : (
          <span className="min-w-0 truncate text-h-section font-bold">{businessName}</span>
        )}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-caption font-medium uppercase tracking-wide" style={{ color: mix(look.ink, 75) }}>
            {label}
          </span>
          <span className="text-price-lg font-bold tabular-nums">{value}</span>
        </div>
      </div>

      {(children || look.coverUrl) && (
        <div className={`relative ${children ? "" : "aspect-[2.2/1]"}`}>
          {look.coverUrl && (
            <>
              <img src={look.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {children && <div className="absolute inset-0 bg-black/45" />}
            </>
          )}
          {children && <div className="relative px-5 py-6">{children(middleInk)}</div>}
        </div>
      )}

      {fields.length > 0 && (
        <dl className="flex items-start justify-between gap-4 px-5 pt-4 pb-5">
          {fields.map((field, index) => (
            <div key={field.label} className={`flex min-w-0 flex-col ${index > 0 ? "items-end text-right" : ""}`}>
              <dt className="text-caption font-medium uppercase tracking-wide" style={{ color: mix(look.ink, 75) }}>
                {field.label}
              </dt>
              <dd className="text-body font-semibold">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * The visits on the card: each one earned shows the business's picture in full,
 * each one still to come a faint outline of it. Rows of five at most, centred.
 */
export function StampGrid({
  look,
  ink,
  required,
  stamps,
  popIndex = null,
  popClassName = "",
}: {
  look: CardLook;
  ink: string;
  required: number;
  stamps: number;
  popIndex?: number | null;
  popClassName?: string;
}) {
  return (
    <ol className="mx-auto flex max-w-[18.5rem] flex-wrap justify-center gap-3" aria-hidden="true">
      {Array.from({ length: required }, (_, index) => {
        const earned = index < stamps;
        const slot: CSSProperties = earned
          ? look.stamp.kind === "icon"
            ? // The icon in the card's colour on a solid disc, unless that colour is too pale for the white disc over a photo.
              { backgroundColor: ink, color: look.coverUrl && look.ink !== "#ffffff" ? "#16181b" : look.color }
            : { backgroundColor: mix(ink, 22) }
          : { border: `2px dashed ${mix(ink, 45)}`, color: mix(ink, 45) };
        return (
          <li
            key={index}
            style={slot}
            className={`flex size-12 items-center justify-center rounded-full ${earned && popIndex === index ? popClassName : ""}`}
          >
            {look.stamp.kind === "icon" ? (
              <StampIcon name={look.stamp.name} className="size-7" />
            ) : (
              <img
                src={look.stamp.url}
                alt=""
                className={`size-9 object-contain ${earned ? "" : "opacity-40 grayscale"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
