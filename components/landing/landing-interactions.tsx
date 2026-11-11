"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { MEMBER_LOGIN_PATH } from "@/lib/auth/route-access";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import s from "./landing.module.css";

export function MotionToggle({ locale }: { locale: Locale }) {
  const [paused, setPaused] = useState(false);
  return <button type="button" className={s.motionToggle} aria-pressed={paused} onClick={() => {
    const next = !paused;
    setPaused(next);
    document.getElementById("top")?.setAttribute("data-motion-paused", String(next));
  }}>{pick(locale, { es: paused ? "Reanudar animación" : "Pausar animación", en: paused ? "Resume animation" : "Pause animation" })}</button>;
}

export function LandingHeader({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const t = (es: string, en: string) => pick(locale, { es, en });
  const links = [["#soluciones", t("Soluciones", "Solutions")], ["#experiencias", t("Experiencias", "Experiences")], ["#proceso", t("Cómo trabajamos", "How we work")]];
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    const closeOutside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setOpen(false); };
    const wideScreen = window.matchMedia("(min-width: 1000px)");
    const closeOnResize = () => { if (wideScreen.matches) setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    wideScreen.addEventListener("change", closeOnResize);
    return () => { document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("pointerdown", closeOutside); wideScreen.removeEventListener("change", closeOnResize); };
  }, [open]);
  return <header ref={header} className={s.header}><div className={`${s.container} ${s.headerInner}`}>
    <a href="#top" aria-label={t("CIRIX — inicio", "CIRIX — home")}><Image src="/brand/logo-white.svg" alt="CIRIX" width={128} height={46} className={s.logo} /></a>
    <nav className={s.desktopNav} aria-label={t("Navegación principal", "Main navigation")}>{links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}</nav>
    <div className={s.headerActions}><LanguageSwitcher /><LocalizedLink href={MEMBER_LOGIN_PATH} className={s.signIn}>{t("Ingresar", "Sign in")} <span aria-hidden="true">↗</span></LocalizedLink><button ref={toggle} type="button" className={s.menuToggle} aria-label={open ? t("Cerrar menú", "Close menu") : t("Abrir menú", "Open menu")} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(!open)}><span aria-hidden="true">{open ? "×" : "☰"}</span></button></div>
    <nav id="landing-mobile-menu" className={s.mobileNav} hidden={!open} aria-label={t("Navegación móvil", "Mobile navigation")}>{links.map(([href, label]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></a>)}<a href="#contacto" onClick={() => setOpen(false)}>{t("Contacto", "Contact")} ↗</a></nav>
  </div></header>;
}

// Content is visible by default, including when JavaScript is unavailable.
export function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("top");
    if (!root || !("IntersectionObserver" in window)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reducedMotion.matches || typeof entry.target.animate !== "function") return;
        const animation = entry.target.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0.08 });
    root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    const stopMotion = () => { if (reducedMotion.matches) { animations.forEach((animation) => animation.cancel()); animations.clear(); } };
    reducedMotion.addEventListener("change", stopMotion);
    return () => { observer.disconnect(); animations.forEach((animation) => animation.cancel()); reducedMotion.removeEventListener("change", stopMotion); };
  }, []);
  return null;
}

export function SolutionExplorer({ locale, authenticated }: { locale: Locale; authenticated: boolean }) {
  const [selected, setSelected] = useState(0);
  const t = (es: string, en: string) => pick(locale, { es, en });
  const journeys = [
    { label: t("Vender mejor", "Sell smarter"), tag: "SALES & RELATIONSHIPS", title: t("Que ninguna conversación se quede a mitad de camino.", "Keep every conversation moving forward."), description: t("Imagina un recorrido donde tu equipo identifica una oportunidad, organiza su seguimiento y entiende el contacto telefónico. Explora las piezas de ese proceso.", "Imagine a journey where your team identifies an opportunity, organizes follow-up, and understands phone contact. Explore the pieces of that process."), steps: [t("Nueva oportunidad", "New opportunity"), t("Seguimiento comercial", "Sales follow-up"), t("Visibilidad de llamadas", "Call visibility")], modules: [{ title: "Zoho CRM", href: "/zoho" }, { title: "Call Tracking", href: "/calls" }] },
    { label: t("Crear lealtad", "Build loyalty"), tag: "COMMERCE & RETENTION", title: t("Dale a tus clientes una razón para volver.", "Give your customers a reason to come back."), description: t("Recorre una experiencia de compra con recompensas, billetera y referidos. Descubre también cómo un asistente puede acompañar las consultas de tus clientes.", "Explore a shopping experience with rewards, a wallet, and referrals. Discover how an assistant can also support your customers' questions."), steps: [t("Primera compra", "First purchase"), t("Recompensas y referidos", "Rewards and referrals"), t("Próxima visita", "Next visit")], modules: [{ title: "Loyalty Commerce", href: "/demo/mercado-fresco" }, { title: "AI Customer Support", href: "/ai-support" }] },
    { label: t("Simplificar la operación", "Simplify operations"), tag: "AUTOMATION & AI", title: t("Más espacio para el trabajo que importa.", "More room for the work that matters."), description: t("Visualiza un flujo de onboarding o un traspaso comercial y prueba una experiencia de asistencia. Un punto de partida para diseñar tu propia automatización.", "Visualize an onboarding flow or sales handoff and try an assistance experience. A starting point for designing your own automation."), steps: [t("Una tarea repetitiva", "A repetitive task"), t("Un flujo definido", "A defined workflow"), t("Un equipo enfocado", "A focused team")], modules: [{ title: "n8n Automation Studio", href: "/n8n" }, { title: "AI Customer Support", href: "/ai-support" }] },
  ];
  const journey = journeys[selected];
  return <div className={s.explorer}>
    <div className={s.explorerTabs} role="group" aria-label={t("Elige un objetivo para tu negocio", "Choose a goal for your business")}>{journeys.map((item, index) => <button type="button" key={item.tag} aria-pressed={selected === index} aria-controls="journey-panel" onClick={() => setSelected(index)}>{item.label}<span aria-hidden="true">↗</span></button>)}</div>
    <div id="journey-panel" className={s.journeyPanel} aria-live="polite" aria-atomic="true"><div key={journey.tag} className={s.journeyContent}><p className={s.eyebrow}>{journey.tag}</p><h3>{journey.title}</h3><p>{journey.description}</p><div className={s.journeyLinks}>{journey.modules.map((module) => <LocalizedLink href={authenticated ? module.href : `/login?from=${encodeURIComponent(localizeHref(locale, module.href))}`} key={module.href}>{t("Explorar", "Explore")} {module.title} <span aria-hidden="true">↗</span></LocalizedLink>)}</div></div><div className={s.journeyFlow}><p>{t("UN RECORRIDO POSIBLE", "A POSSIBLE JOURNEY")}</p><ol>{journey.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong><span aria-hidden="true">{index === 2 ? "✓" : "↓"}</span></li>)}</ol><small>{t("Las conexiones se definen según el alcance de cada proyecto.", "Connections are defined according to each project's scope.")}</small></div></div>
  </div>;
}
