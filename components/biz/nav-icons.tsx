import type { SVGProps } from "react";

/*
 * Icons of the business panel's menu: the storefront's outline family (24px
 * grid, 1.75 stroke, round caps), colored by `currentColor`. Each one names its
 * section with a picture people already know from other apps.
 */

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export type NavIconName = "home" | "scan" | "activity" | "gift" | "card" | "qr" | "receipt" | "team" | "more" | "account" | "signout" | "palette";

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  // A camera frame: what the screen opens.
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M8 12h8" />
    </>
  ),
  activity: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V7M17 16v-6" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v7.5h14V12M12 8v11.5" />
      <path d="M12 8C10.5 5 7.5 4.5 7 6.5S9.5 8 12 8ZM12 8c1.5-3 4.5-3.5 5-1.5S14.5 8 12 8Z" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <circle cx="8" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="16" cy="12" r="1.6" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2M20 14v.01M18 18h2v2M14 20h.01M14 17v.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5Z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.9c1.6.6 2.6 2.2 3 4.6" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.9 1.4-1.9-.5-1.2.3-2.6 1.6-2.6h2a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9Z" />
      <circle cx="7.8" cy="11" r="1.1" />
      <circle cx="10.5" cy="7.3" r="1.1" />
      <circle cx="15" cy="7.8" r="1.1" />
    </>
  ),
  more: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  signout: (
    <>
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
};

export function NavIcon({ name, ...props }: { name: NavIconName } & SVGProps<SVGSVGElement>) {
  return <Icon {...props}>{PATHS[name]}</Icon>;
}
