"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { useLocale } from "@/components/locale-provider";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MEMBER_LOGIN_PATH } from "@/lib/auth/route-access";
import { pick } from "@/lib/locale";
import { NavIcon, type NavIconName } from "./nav-icons";

/** One section of the business panel. The server decides which ones the viewer's role may see. */
export type BusinessNavItem = { href: string; label: string; icon: NavIconName };

type NavProps = { home: string; items: BusinessNavItem[]; businessName: string; roleLabel: string };

/** How many sections fit in the phone's bottom bar next to "More". */
const BAR_SLOTS = 3;

function useActive(home: string) {
  const pathname = usePathname();
  const current = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
  // Home lights up on the home page itself, not on every section below it.
  return (href: string) => (href === home ? current === home : current === href || current.startsWith(`${href}/`));
}

const ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * The computer's menu: a column at the left with the product, the business and
 * every section by name. The current one sits on a grey band, the rest stay quiet.
 */
export function BusinessSidebar({ home, items, businessName, roleLabel }: NavProps) {
  const locale = useLocale();
  const isActive = useActive(home);

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface md:flex print:hidden">
      <div className="flex flex-col gap-4 px-5 pt-6 pb-5">
        <Image src="/brand/logo-dark.svg" alt="CIRIX" width={160} height={57} className="h-auto w-20" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-title font-bold text-text">{businessName}</span>
          <span className="text-label text-text-muted">{roleLabel}</span>
        </div>
      </div>
      <nav aria-label={pick(locale, { es: "Secciones del negocio", en: "Business sections" })} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <LocalizedLink
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${ROW} ${active ? "bg-stone-100 font-semibold text-text" : "text-text-muted hover:bg-stone-50 hover:text-text"}`}
            >
              <NavIcon name={item.icon} className={`h-5 w-5 shrink-0 ${active ? "text-accent" : ""}`} />
              {item.label}
            </LocalizedLink>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-border px-3 py-4">
        <LocalizedLink href="/me" className={`${ROW} text-text-muted hover:bg-stone-50 hover:text-text`}>
          <NavIcon name="account" className="h-5 w-5 shrink-0" />
          {pick(locale, { es: "Mi cuenta", en: "My account" })}
        </LocalizedLink>
        <SignOutButton
          redirectTo={MEMBER_LOGIN_PATH}
          leading={<NavIcon name="signout" className="h-5 w-5 shrink-0" />}
          className={`${ROW} text-text-muted hover:bg-stone-50 hover:text-text disabled:opacity-60`}
        />
      </div>
    </aside>
  );
}

/**
 * The phone's menu: a bar fixed at the bottom with the main sections as large
 * icons with their names, like the apps people already use. Everything else
 * (the other sections, the account and signing out) is one tap away under "More".
 */
export function BusinessTabBar({ home, items }: Pick<NavProps, "home" | "items">) {
  const locale = useLocale();
  const isActive = useActive(home);
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);

  const inBar = items.slice(0, BAR_SLOTS);
  const inMore = items.slice(BAR_SLOTS);
  const moreActive = inMore.some((item) => isActive(item.href));
  const moreLabel = pick(locale, { es: "Más", en: "More" });

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("a, button")?.focus();
    const opener = moreButton.current;
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label={pick(locale, { es: "Secciones del negocio", en: "Business sections" })}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <div className="mx-auto grid w-full max-w-[26rem] px-2 py-1.5" style={{ gridTemplateColumns: `repeat(${inBar.length + 1}, minmax(0, 1fr))` }}>
          {inBar.map((item) => {
            const active = isActive(item.href);
            return (
              <LocalizedLink key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                <TabIcon name={item.icon} active={active} />
                <span className="max-w-full truncate">{item.label}</span>
              </LocalizedLink>
            );
          })}
          <button
            ref={moreButton}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={tabClass(moreActive)}
          >
            <TabIcon name="more" active={moreActive} />
            <span>{moreLabel}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label={pick(locale, { es: "Cerrar", en: "Close" })}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-950/40"
          />
          <div
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label={moreLabel}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[26rem] flex-col gap-1 rounded-t-2xl bg-surface px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-float"
          >
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-h-section font-bold text-text">{moreLabel}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-pill px-3 text-body font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {pick(locale, { es: "Cerrar", en: "Close" })}
              </button>
            </div>
            {inMore.map((item) => {
              const active = isActive(item.href);
              return (
                <LocalizedLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`${SHEET_ROW} ${active ? "bg-stone-100 font-semibold" : ""}`}
                >
                  <NavIcon name={item.icon} className="h-6 w-6 shrink-0 text-accent" />
                  {item.label}
                </LocalizedLink>
              );
            })}
            <div className={inMore.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
              <LocalizedLink href="/me" onClick={() => setOpen(false)} className={SHEET_ROW}>
                <NavIcon name="account" className="h-6 w-6 shrink-0 text-text-muted" />
                {pick(locale, { es: "Mi cuenta", en: "My account" })}
              </LocalizedLink>
              <SignOutButton
                redirectTo={MEMBER_LOGIN_PATH}
                leading={<NavIcon name="signout" className="h-6 w-6 shrink-0 text-text-muted" />}
                className={`${SHEET_ROW} disabled:opacity-60`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SHEET_ROW =
  "flex min-h-14 w-full items-center gap-4 rounded-lg px-3 text-left text-body text-text transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const tabClass = (active: boolean) =>
  `flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
    active ? "font-semibold text-accent-strong" : "font-medium text-text-muted hover:text-text"
  }`;

function TabIcon({ name, active }: { name: NavIconName; active: boolean }) {
  return (
    <span className={`grid h-8 w-14 place-items-center rounded-pill transition-colors ${active ? "bg-accent-soft" : ""}`}>
      <NavIcon name={name} className="h-6 w-6" />
    </span>
  );
}
