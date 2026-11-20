"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { LocalizedLink } from "@/components/localized-link";
import { MEMBER_LOGIN_PATH } from "@/lib/auth/route-access";
import type { Locale } from "@/lib/locale";
import { Icon } from "./home-icons";
import { WHATSAPP_NUMBER, type HomeCopy } from "./home-content";
import s from "./home.module.css";

type Plan = "monthly" | "annual" | "advice";
const CONTACT_EVENT = "cirix:contact";

/** Any "Get started" on the page: opens the contact form, remembering the plan when it knows one. */
export function ContactButton({ className, plan, children }: { className?: string; plan?: Plan; children: ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => window.dispatchEvent(new CustomEvent(CONTACT_EVENT, { detail: { plan, trigger: event.currentTarget } }))}
    >
      {children}
    </button>
  );
}

export function HomeHeader({ copy, locale }: { copy: HomeCopy; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const onPointer = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (wide.matches) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    wide.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      wide.removeEventListener("change", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  const other: Locale = locale === "es" ? "en" : "es";
  return (
    <header ref={header} className={s.siteHeader}>
      <nav className={s.navInner} aria-label={copy.nav.label}>
        <a className={s.brand} href="#inicio" aria-label={copy.nav.homeLabel}>
          <Image src="/brand/logo-dark.svg" alt="" width={160} height={57} className={s.brandLogo} priority />
        </a>
        <button
          ref={toggle}
          type="button"
          className={s.menuToggle}
          aria-label={open ? copy.nav.close : copy.nav.open}
          aria-expanded={open}
          aria-controls="home-nav-links"
          onClick={() => setOpen(!open)}
        >
          <span /><span />
        </button>
        <div className={s.navLinks} id="home-nav-links" data-open={open}>
          <a href="#inicio" onClick={close}>{copy.nav.home}</a>
          <a href="#tarjetas" onClick={close}>{copy.nav.cards}</a>
          <a href="#proceso" onClick={close}>{copy.nav.process}</a>
          <a href="#contacto" onClick={close}>{copy.nav.contact}</a>
          <LocalizedLink href={MEMBER_LOGIN_PATH} className={s.menuOnly}>{copy.nav.signIn}</LocalizedLink>
          <a href={`/${other}`} hrefLang={other} className={s.menuOnly}>{other === "en" ? "English" : "Español"}</a>
        </div>
        <div className={s.navEnd}>
          <div className={s.language}>
            {(["es", "en"] as const).map((target) => (
              <a key={target} href={`/${target}`} hrefLang={target} aria-current={target === locale ? "page" : undefined}>
                {target.toUpperCase()}
              </a>
            ))}
          </div>
          <LocalizedLink href={MEMBER_LOGIN_PATH} className={s.signIn}>{copy.nav.signIn}</LocalizedLink>
          <ContactButton className={`${s.button} ${s.navAction}`}>{copy.nav.start}</ContactButton>
        </div>
      </nav>
    </header>
  );
}

export function ProcessSteps({ copy }: { copy: HomeCopy }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const steps = copy.process.steps;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = steps.length - 1;
    const next =
      event.key === "ArrowRight" ? (index + 1) % steps.length
      : event.key === "ArrowLeft" ? (index - 1 + steps.length) % steps.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <>
      <div className={s.stepTabs} role="tablist" aria-label={copy.process.tabsLabel}>
        {steps.map((_, index) => (
          <button
            key={index}
            ref={(element) => { tabs.current[index] = element; }}
            className={s.stepTab}
            id={`step-tab-${index + 1}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`step-panel-${index + 1}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span>{copy.process.step} {index + 1}</span>
          </button>
        ))}
      </div>
      {steps.map((step, index) => (
        <div
          key={index}
          className={s.stepPanel}
          id={`step-panel-${index + 1}`}
          role="tabpanel"
          aria-labelledby={`step-tab-${index + 1}`}
          tabIndex={0}
          hidden={active !== index}
        >
          <div className={s.stepGraphic}>
            <div className={step.phone ? s.stepPhoneFill : s.stepImageFill}>
              <Image src={step.image} alt={step.alt} width={step.width} height={step.height} sizes="(max-width: 809px) 90vw, 500px" />
            </div>
          </div>
          <div className={s.stepCopy}>
            <span className={s.eyebrow}>{copy.process.step} {index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        </div>
      ))}
    </>
  );
}

/** The numbers count up once, the first time they scroll into view; the final value is in the markup. */
export function StatCounters({ copy }: { copy: HomeCopy }) {
  const grid = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const element = grid.current;
    if (!element || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 1050, 1);
        setProgress(1 - Math.pow(1 - t, 3));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setProgress(0);
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    // Only animate numbers the visitor has not seen yet.
    const rect = element.getBoundingClientRect();
    if (rect.top > window.innerHeight) observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div ref={grid} className={s.statsGrid}>
      {copy.stats.items.map((stat) => (
        <div key={stat.label} className={s.stat}>
          <div className={s.statValue} role="img" aria-label={stat.aria}>
            <span aria-hidden="true">{Math.round(stat.value * progress)}</span>
            <span aria-hidden="true" className={s.statUnit}>{stat.unit}</span>
          </div>
          <p className={s.statLabel}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function Pricing({ copy }: { copy: HomeCopy }) {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const p = copy.pricing;
  const annual = period === "annual";
  return (
    <div className={s.pricingWidget}>
      <div className={s.billingArea}>
        <div className={s.billingToggle} role="radiogroup" aria-label={p.periodLabel} data-period={period}>
          {(["monthly", "annual"] as const).map((option) => (
            <button key={option} type="button" role="radio" aria-checked={period === option} onClick={() => setPeriod(option)}>
              {option === "monthly" ? p.monthly : p.annual}
            </button>
          ))}
        </div>
        <span className={s.billingNote}>{p.save}</span>
        <p className={s.billingNote}>{p.note}</p>
      </div>
      <div className={s.priceCard}>
        <div className={s.priceTop}>
          <div className={s.priceBadges}>
            <span className={s.eyebrow}>{p.plan}</span>
            <span className={`${s.eyebrow} ${s.tax}`}>{p.tax}</span>
          </div>
          <div className={s.priceLine}>
            <span className={s.priceAmount}>
              {annual ? p.annualAmount : p.monthlyAmount}{p.currency}
            </span>
            <span className={s.pricePeriod}>{p.perMonth}</span>
          </div>
          <p className={s.priceDescription}>{p.description}</p>
          {annual && <p className={s.priceAnnualDetail}>{p.annualDetail}</p>}
        </div>
        <ul className={s.priceIncluded}>
          {p.included.map((item) => <li key={item}><Icon name="check" />{item}</li>)}
        </ul>
        <ContactButton className={s.button} plan={period}>{p.cta}</ContactButton>
      </div>
    </div>
  );
}

/**
 * The mockup's contact form. There is no inbox behind it yet, so instead of
 * pretending to send, it opens WhatsApp with the message written out; the
 * visitor decides whether to send it.
 */
export function ContactDialog({ copy }: { copy: HomeCopy }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [plan, setPlan] = useState<Plan>("monthly");
  const c = copy.contact;

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ plan?: Plan; trigger?: HTMLElement }>).detail ?? {};
      if (detail.plan) setPlan(detail.plan);
      trigger.current = detail.trigger ?? null;
      if (!dialog.current?.open) dialog.current?.showModal();
    };
    window.addEventListener(CONTACT_EVENT, onOpen);
    return () => window.removeEventListener(CONTACT_EVENT, onOpen);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    for (const key of ["name", "business"]) {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      input.value = input.value.trim();
    }
    if (!form.reportValidity()) return;
    const lines = [
      c.greeting,
      "",
      `${c.lines.name}: ${value("name")}`,
      `${c.lines.business}: ${value("business")}`,
      `${c.lines.type}: ${value("type")}`,
      `${c.lines.plan}: ${c.plans[plan]}`,
      ...(value("message") ? [`${c.lines.goal}: ${value("message")}`] : []),
    ];
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="contact-dialog-title"
      onClose={() => { if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself, outside its box.
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
        if (outside) event.currentTarget.close();
      }}
    >
      <button className={s.dialogClose} type="button" aria-label={c.close} onClick={() => dialog.current?.close()}>
        <Icon name="close" />
      </button>
      <div className={s.dialogContent}>
        <span className={s.eyebrow}>{c.eyebrow}</span>
        <h2 id="contact-dialog-title">{c.title}</h2>
        <p className={s.dialogIntro}>{c.intro}</p>
        <form className={s.contactForm} onSubmit={onSubmit}>
          <div className={s.formRow}>
            <div className={s.field}>
              <label htmlFor="contact-name">{c.name}</label>
              <input id="contact-name" name="name" autoComplete="name" placeholder={c.namePlaceholder} maxLength={100} required />
            </div>
            <div className={s.field}>
              <label htmlFor="contact-business">{c.business}</label>
              <input id="contact-business" name="business" autoComplete="organization" placeholder={c.businessPlaceholder} maxLength={120} required />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.field}>
              <label htmlFor="contact-type">{c.type}</label>
              <select id="contact-type" name="type" required defaultValue="">
                <option value="" disabled>{c.typePlaceholder}</option>
                {c.types.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="contact-plan">{c.plan}</label>
              <select id="contact-plan" name="plan" value={plan} onChange={(event) => setPlan(event.target.value as Plan)}>
                <option value="monthly">{c.plans.monthly}</option>
                <option value="annual">{c.plans.annual}</option>
                <option value="advice">{c.plans.advice}</option>
              </select>
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="contact-message">{c.message} <span>{c.optional}</span></label>
            <textarea id="contact-message" name="message" placeholder={c.messagePlaceholder} maxLength={1500} />
          </div>
          <button className={s.button} type="submit">
            {c.submit}
            <Icon name="arrow" className={s.icon} />
          </button>
          <p className={s.formNote}>{c.note}</p>
        </form>
      </div>
    </dialog>
  );
}

/** Sections rise into view as the visitor scrolls, as in the mockup. Without JavaScript they are simply there. */
export function Reveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")]
      // Whatever is already on screen stays put.
      .filter((element) => element.getBoundingClientRect().top > window.innerHeight);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(s.isVisible);
        observer.unobserve(entry.target);
      }
    // Tall blocks (the steps, the card grid) start rising as soon as their top edge shows.
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    for (const element of elements) {
      element.classList.add(s.revealReady);
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
