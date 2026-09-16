import type { Metadata } from "next";
import Image from "next/image";
import { LocalizedLink } from "@/components/localized-link";
import { LandingHeader, LandingMotion, MotionToggle, SolutionExplorer } from "@/components/landing/landing-interactions";
import { getCurrentLocale, localizeHref, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/auth/dal";
import { MVP_MODULES } from "@/shared/mvp-modules";
import s from "@/components/landing/landing.module.css";
import { homeMetadata, SITE_STRUCTURED_DATA } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadata(await getCurrentLocale());
}

export default async function ModulesLandingPage() {
  const [locale, viewer] = await Promise.all([getCurrentLocale(), getViewer()]);
  const t = (es: string, en: string) => pick(locale, { es, en });
  const outcomes = [
    [t("Cada oportunidad, en su lugar.", "Every opportunity, in the right place."), t("Da continuidad a cada conversación y una visión compartida a tu equipo comercial.", "Keep every conversation moving and give your sales team a shared view.")],
    [t("Una compra es solo el comienzo.", "A purchase is just the beginning."), t("Crea motivos para volver con recompensas, referidos y experiencias de compra conectadas.", "Give customers reasons to return with rewards, referrals, and connected shopping experiences.")],
    [t("Menos tareas. Más posibilidades.", "Fewer tasks. More possibilities."), t("Explora cómo la automatización y la IA pueden acompañar el trabajo de tu equipo.", "Explore how automation and AI can support your team's work.")],
  ];
  const steps = [
    [t("Entendemos", "Discover"), t("Empezamos por tu operación, tus clientes y la oportunidad que quieres resolver.", "We start with your operation, your customers, and the opportunity you want to address.")],
    [t("Diseñamos", "Design"), t("Definimos el recorrido, los puntos de contacto y la solución que tiene sentido para tu negocio.", "We define the journey, the touchpoints, and the solution that makes sense for your business.")],
    [t("Validamos", "Validate"), t("Probamos una experiencia concreta con tu equipo antes de avanzar hacia una implementación.", "We test a tangible experience with your team before moving toward implementation.")],
    [t("Evolucionamos", "Evolve"), t("Acordamos las integraciones y los indicadores para construir la siguiente etapa.", "We agree on integrations and success measures to build the next stage.")],
  ];
  const faqs = [
    [t("¿Quién puede acceder a las demos y módulos?", "Who can access the demos and modules?"), t("La solicitud de reseñas de Google es pública. Para los demás módulos, solo pueden acceder las cuentas creadas y habilitadas previamente por un administrador. Inicia sesión con la cuenta de Google autorizada. No hay registro público; si necesitas acceso, contacta a CIRIX.", "Google review requests are public. Other modules are available only to accounts previously created and enabled by an administrator. Sign in with your authorized Google account. Public registration is not available; contact CIRIX if you need access.")],
    [t("¿Qué puedo explorar en esta plataforma?", "What can I explore on this platform?"), t("Siete soluciones: Google Reviews, Pixel Hub, Zoho CRM, Loyalty Commerce, n8n Automation Studio, AI Customer Support y Call Tracking. Cada una permite conocer sus capacidades y conversar sobre su aplicación en tu negocio.", "Seven solutions: Google Reviews, Pixel Hub, Zoho CRM, Loyalty Commerce, n8n Automation Studio, AI Customer Support, and Call Tracking. Each lets you explore its capabilities and discuss how they could apply to your business.")],
    [t("¿Las demos son implementaciones finales?", "Are the demos final implementations?"), t("Son puntos de partida para evaluar la experiencia. Los módulos indican si son MVPs activos o demos visuales. Las integraciones, los datos reales y el alcance de producción se definen para cada proyecto.", "They are starting points for evaluating the experience. Modules indicate whether they are active MVPs or visual demos. Integrations, real data, and production scope are defined for each project.")],
    [t("¿Puedo empezar con una sola solución?", "Can I start with a single solution?"), t("Sí. Podemos comenzar por una necesidad específica, como seguimiento comercial o recompensas, y evaluar otras capacidades conforme evolucione tu operación.", "Yes. We can start with a specific need, such as sales follow-up or rewards, and evaluate other capabilities as your operation evolves.")],
    [t("¿Cómo se conectaría con mis herramientas?", "How would it connect to my tools?"), t("Primero revisamos tus herramientas, los datos disponibles y el recorrido que quieres habilitar. A partir de esa revisión definimos las integraciones necesarias; no todas las conexiones están activas en las demos.", "First, we review your tools, available data, and the journey you want to enable. We then define the integrations required; not all connections are active in the demos.")],
    [t("¿Cómo puedo conversar sobre mi proyecto?", "How can I discuss my project?"), t("Usa el botón de contacto para abrir una conversación con CIRIX por WhatsApp. Cuéntanos qué quieres mejorar y qué herramientas utiliza hoy tu equipo.", "Use the contact button to start a conversation with CIRIX on WhatsApp. Tell us what you want to improve and which tools your team uses today.")],
  ];
  const contactHref = `https://wa.me/12393403877?text=${encodeURIComponent(t("Hola CIRIX, me gustaría conocer sus soluciones tecnológicas para mi negocio.", "Hello CIRIX, I'd like to learn about your technology solutions for my business."))}`;
  return <div className={s.landing} id="top">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(SITE_STRUCTURED_DATA).replace(/</g, "\\u003c"),
      }}
    />
    <a href="#main-content" className={s.skipLink}>{t("Saltar al contenido", "Skip to content")}</a>
    <LandingMotion /><LandingHeader locale={locale} />
    <main id="main-content">
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={`${s.container} ${s.heroInner}`}>
          <div className={s.heroCopy}>
            <p className={s.eyebrow}><span className={s.statusDot} /> CIRIX · DIGITAL BUSINESS SOLUTIONS</p>
            <h1 id="hero-title">{t("Tu próximo", "Your next")}<br />{t("gran paso,", "big move,")}<br /><span>{t("conectado.", "connected.")}</span></h1>
            <p className={s.heroDescription}>{t("Tecnología que convierte conversaciones en clientes y clientes en relaciones que duran.", "Technology that turns conversations into customers, and customers into lasting relationships.")}</p>
            <div className={s.actions}><a href="#soluciones" className={s.primaryButton}>{t("Explorar soluciones", "Explore solutions")} <span aria-hidden="true">↗</span></a><a href="#ecosistema" className={s.textButton}>{t("Descubrir el ecosistema", "Discover the ecosystem")} <span aria-hidden="true">↓</span></a></div>
            <div className={s.heroNote}><span className={s.noteLine} />{t("Explora la oferta. Accede a las demos con una cuenta autorizada.", "Explore our solutions. Access demos with an authorized account.")}</div>
          </div>
          <div className={s.ecosystemVisual} aria-label={t("Explora las suites del ecosistema CIRIX", "Explore the suites in the CIRIX ecosystem")}>
            <div className={s.visualHeading}><span>CIRIX ECOSYSTEM</span><span className={s.visualVersion}>{t("VISTA CONCEPTUAL", "CONCEPT VIEW")}</span></div>
            <div className={s.orbit}>
              <div className={s.orbitRing} aria-hidden="true" /><div className={s.orbitRingInner} aria-hidden="true" />
              <div className={s.orbitCenter}><Image src="/brand/logo-white.svg" alt="CIRIX" width={130} height={47} /><span>{t("TU NEGOCIO, AL CENTRO", "YOUR BUSINESS AT THE CENTER")}</span></div>
              {MVP_MODULES.filter((module) => module.slug !== "reviews").map((module, index) => <a key={module.slug} href={`#solution-${module.slug}`} className={`${s.orbitNode} ${s[`node${index}`]}`}><span className={s.nodeSymbol} aria-hidden="true">{["◎", "↗", "♡", "⌘", "✳", "↗"][index]}</span><span>{["Pixel Hub", "CRM", "Loyalty", "Automation", "AI Support", "Call Tracking"][index]}</span></a>)}
            </div>
            <div className={s.visualFooter}><span className={s.statusDot} /><p>{t("De la primera conversación a la próxima compra.", "From the first conversation to the next purchase.")}</p><span aria-hidden="true">↗</span></div>
          </div>
        </div>
        <div className={`${s.container} ${s.heroBottom}`}><span>01 — {t("EL FUTURO SE CONSTRUYE", "THE FUTURE IS BUILT")}</span><MotionToggle locale={locale} /><a href="#ecosistema">{t("SIGUE EXPLORANDO", "KEEP EXPLORING")} <span aria-hidden="true">↓</span></a></div>
      </section>
      <div className={s.marquee} aria-label="Pixel Hub · CRM · Loyalty · Automation · AI Support · Call Tracking"><div className={s.marqueeTrack} aria-hidden="true">{[0, 1].map((copy) => <div key={copy}>{["PIXEL HUB", "CRM", "LOYALTY", "AUTOMATION", "AI SUPPORT", "CALL TRACKING"].map((name) => <span key={name}>{name}<b>✳</b></span>)}</div>)}</div></div>
      <section id="ecosistema" className={`${s.container} ${s.section}`} aria-labelledby="ecosystem-title">
        <div className={s.sectionHeading} data-reveal><p className={s.eyebrow}>02 / {t("UNA VISIÓN CONECTADA", "A CONNECTED VISION")}</p><h2 id="ecosystem-title">{t("Tu negocio no se detiene.", "Your business keeps moving.")}<br /><span>{t("Tu tecnología tampoco debería.", "Your technology should, too.")}</span></h2><p>{t("Desde captar una oportunidad hasta construir lealtad: diseñamos experiencias alrededor de lo que realmente importa. Tus clientes.", "From capturing an opportunity to building loyalty: we design experiences around what truly matters. Your customers.")}</p></div>
        <div className={s.outcomes}>{outcomes.map(([title, description], index) => <article key={title} data-reveal><span className={s.outcomeNumber}>0{index + 1}<span aria-hidden="true">↗</span></span><h3>{title}</h3><p>{description}</p></article>)}</div>
        <div className={s.facts} data-reveal><div><strong>0{MVP_MODULES.length}</strong><span>{t("soluciones para explorar", "solutions to explore")}</span></div><div><strong>ES / EN</strong><span>{t("experiencias en dos idiomas", "experiences in two languages")}</span></div><div><strong>01</strong><span>{t("visión: hacer crecer tu negocio", "vision: grow your business")}</span></div></div>
      </section>
      <section id="soluciones" className={s.solutionsSection} aria-labelledby="solutions-title"><div className={`${s.container} ${s.section}`}>
        <div className={s.splitHeading} data-reveal><div><p className={s.eyebrow}>03 / {t("SOLUCIONES CON PROPÓSITO", "PURPOSEFUL SOLUTIONS")}</p><h2 id="solutions-title">{t("La pieza que necesitas.", "The piece you need.")}<br /><span>{t("El potencial que sigue.", "The potential ahead.")}</span></h2></div><p>{t("Explora nuestras suites y descubre cómo pueden formar parte de tu próxima etapa.", "Explore our suites and discover how they could be part of your next chapter.")}</p></div>
        <div className={s.solutionGrid}>{MVP_MODULES.map((module, index) => <article id={`solution-${module.slug}`} className={s.solutionCard} key={module.slug} data-reveal>
          <div className={s.cardTop}><span className={s.cardIndex}>/ 0{index + 1}</span><span className={`${s.badge} ${module.status === "preview" ? s.previewBadge : ""}`}><span />{module.badge[locale]}</span></div>
          <div className={s.cardBody}><p className={s.cardEyebrow}>{module.eyebrow[locale]}</p><h3>{module.title}</h3><p>{module.summary[locale]}</p><ul>{module.capabilities.map((capability) => <li key={capability.en}><span aria-hidden="true">↗</span>{capability[locale]}</li>)}</ul></div>
          <LocalizedLink href={(viewer.authenticated || module.public) ? module.href : `/login?from=${encodeURIComponent(localizeHref(locale, module.href))}`} className={s.cardLink}>{module.ctaLabel[locale]}<span aria-hidden="true">↗</span></LocalizedLink>
        </article>)}</div>
      </div></section>
      <section id="experiencias" className={`${s.container} ${s.section}`} aria-labelledby="experiences-title"><div className={s.sectionHeading} data-reveal><p className={s.eyebrow}>04 / {t("DE LA IDEA A LA EXPERIENCIA", "FROM IDEA TO EXPERIENCE")}</p><h2 id="experiences-title">{t("Imagina lo que sigue", "Imagine what comes next")}<br /><span>{t("para tu negocio.", "for your business.")}</span></h2><p>{t("Elige un objetivo y descubre un recorrido posible con nuestras soluciones.", "Choose a goal and discover a possible journey with our solutions.")}</p></div><SolutionExplorer locale={locale} authenticated={viewer.authenticated} /></section>
      <section id="proceso" className={s.processSection} aria-labelledby="process-title"><div className={`${s.container} ${s.section}`}><div className={s.splitHeading} data-reveal><div><p className={s.eyebrow}>05 / {t("ASÍ LO HACEMOS", "HOW WE WORK")}</p><h2 id="process-title">{t("Buenas preguntas.", "Good questions.")}<br /><span>{t("Mejores posibilidades.", "Better possibilities.")}</span></h2></div><p>{t("La tecnología es una parte. Entender tu negocio es el punto de partida.", "Technology is one part. Understanding your business is where we start.")}</p></div><div className={s.processGrid}>{steps.map(([title, description], index) => <article key={title} data-reveal><span className={s.stepNumber}>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
      <section id="preguntas" className={`${s.container} ${s.section} ${s.faqSection}`} aria-labelledby="faq-title"><div data-reveal><p className={s.eyebrow}>06 / FAQ</p><h2 id="faq-title">{t("Claro desde", "Clear from")}<br /><span>{t("el comienzo.", "the start.")}</span></h2><p className={s.faqIntro}>{t("Lo que conviene saber antes de dar el siguiente paso.", "What to know before taking the next step.")}</p></div><div className={s.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section id="contacto" className={s.contactSection}><div className={s.container} data-reveal><p className={s.eyebrow}>{t("TU SIGUIENTE CAPÍTULO EMPIEZA AQUÍ", "YOUR NEXT CHAPTER STARTS HERE")}</p><h2>{t("Conectemos", "Let's connect")}<br />{t("lo que sigue.", "what's next.")}<span aria-hidden="true">↗</span></h2><div className={s.contactBottom}><p>{t("Cuéntanos qué quieres transformar. Construyamos juntos el próximo paso.", "Tell us what you want to transform. Let's build the next step together.")}</p><a href={contactHref} target="_blank" rel="noopener noreferrer" className={s.lightButton}>{t("Hablemos por WhatsApp", "Let's talk on WhatsApp")}<span aria-hidden="true">↗</span></a></div></div></section>
    </main>
    <footer className={s.footer}><div className={s.container}><div className={s.footerTop}><a href="#top" aria-label={t("CIRIX — volver al inicio", "CIRIX — back to top")}><Image src="/brand/logo-white.svg" alt="CIRIX" width={145} height={52} /></a><p>{t("Estrategia que conecta. Tecnología que impulsa.", "Strategy that connects. Technology that drives.")}</p><a href="#top" className={s.backTop}>{t("Volver arriba", "Back to top")} ↑</a></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} CIRIX. {t("Todos los derechos reservados.", "All rights reserved.")}</span><nav aria-label={t("Navegación del pie de página", "Footer navigation")}><a href="#soluciones">{t("Soluciones", "Solutions")}</a><a href="#contacto">{t("Contacto", "Contact")}</a><LocalizedLink href="/login">{t("Ingresar", "Sign in")}</LocalizedLink></nav></div></div></footer>
  </div>;
}
