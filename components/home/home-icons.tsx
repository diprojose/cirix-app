import s from "./home.module.css";

export type IconName =
  | "arrow" | "check" | "close" | "star" | "rocket" | "chart" | "smile" | "sad"
  | "percent" | "calendar" | "crown" | "bell";

/** One symbol from the sprite below; decorative, so screen readers skip it. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** The mockup's icon set, drawn once per page and reused through <use>. */
export function IconSprite() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={s.sprite}>
      <defs>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z" /></symbol>
        <symbol id="i-rocket" viewBox="0 0 24 24">
          <path d="M9 14c1-7 5-11 12-11 0 7-4 11-11 12Z" fill="currentColor" opacity=".2" />
          <path d="M9 14c1-7 5-11 12-11 0 7-4 11-11 12ZM9 8H5l-3 6h7M16 15v4l-6 3v-7M6 17l-3 4m5-3-2 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="8" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </symbol>
        <symbol id="i-chart" viewBox="0 0 24 24">
          <path d="M4 15h4v6H4Zm6-5h4v11h-4Zm6-6h4v17h-4Z" fill="currentColor" opacity=".25" />
          <path d="M3 3v18h19M7 15l5-5 4 2 5-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-smile" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".18" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 14a4.5 4.5 0 0 0 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8.5" cy="9" r="1" fill="currentColor" /><circle cx="15.5" cy="9" r="1" fill="currentColor" />
        </symbol>
        <symbol id="i-sad" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".15" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 16a4.5 4.5 0 0 1 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8.5" cy="9" r="1" fill="currentColor" /><circle cx="15.5" cy="9" r="1" fill="currentColor" />
        </symbol>
        <symbol id="i-percent" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".15" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 8l-8 8M9.5 8.5h.01M14.5 15.5h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" fill="currentColor" opacity=".15" />
          <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-crown" viewBox="0 0 24 24">
          <path d="M2 18h20v2H2zM3 14l3-8 6 5 6-5 3 8z" fill="currentColor" opacity=".15" />
          <path d="M2 18h20v2H2zM3 14l3-8 6 5 6-5 3 8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-bell" viewBox="0 0 24 24">
          <path d="M12 2a6 6 0 0 0-6 6v3l-2 3h16l-2-3V8a6 6 0 0 0-6-6z" fill="currentColor" opacity=".15" />
          <path d="M12 2a6 6 0 0 0-6 6v3l-2 3h16l-2-3V8a6 6 0 0 0-6-6zm0 18a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 20z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </defs>
    </svg>
  );
}
