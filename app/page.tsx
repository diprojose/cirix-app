import type { Metadata } from "next";
import Image from "next/image";
import { Roboto, Roboto_Mono } from "next/font/google";
import { LocalizedLink } from "@/components/localized-link";
import { homeCopy } from "@/components/home/home-content";
import { Icon, IconSprite } from "@/components/home/home-icons";
import { ContactButton, ContactDialog, HomeHeader, Pricing, ProcessSteps, Reveal, StatCounters } from "@/components/home/home-interactive";
import s from "@/components/home/home.module.css";
import { getCurrentLocale } from "@/lib/i18n";
import { homeMetadata, SITE_STRUCTURED_DATA } from "@/lib/site-metadata";

const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-roboto", display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-roboto-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadata(await getCurrentLocale());
}

/** The public home page: Cirix's loyalty program for local businesses, as the designer drew it. */
export default async function HomePage() {
  const locale = await getCurrentLocale();
  const copy = homeCopy(locale);

  return (
    <div className={`${s.home} ${roboto.variable} ${robotoMono.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <a className={s.skipLink} href="#contenido">{copy.skip}</a>
      <IconSprite />
      <Reveal />
      <HomeHeader copy={copy} locale={locale} />

      <main id="contenido">
        <section className={s.hero} id="inicio" aria-labelledby="hero-title">
          <div className={s.heroContainer}>
            <div className={s.heroContent}>
              <a className={s.announcement} href="#contacto">
                <strong>CIRIX</strong>
                <span>{copy.hero.announcement}</span>
                <Icon name="arrow" className={s.icon} />
              </a>
              <h1 id="hero-title">{copy.hero.title}</h1>
              <p className={s.heroDescription}>{copy.hero.description}</p>
              <div className={s.heroActions}>
                <ContactButton className={s.button}>{copy.hero.cta}</ContactButton>
                <div className={s.heroReview}>
                  <span className={s.stars} role="img" aria-label={copy.hero.stars}>
                    {[0, 1, 2, 3, 4].map((star) => <Icon key={star} name="star" />)}
                  </span>
                  <span>{copy.hero.review}</span>
                </div>
              </div>
            </div>
            <div className={s.heroScreens}>
              <div className={s.heroPhoto}>
                <Image src="/brand/home/hero.png" alt={copy.hero.photoAlt} width={793} height={440} priority sizes="(max-width: 809px) 100vw, 540px" />
              </div>
              {copy.hero.badges.map((badge, index) => (
                <div key={badge.value} className={`${s.floatingBadge} ${index === 0 ? s.badge1 : s.badge2}`}>
                  <div className={s.badgeIcon}><Icon name={index === 0 ? "check" : "smile"} /></div>
                  <div>
                    <strong>{badge.title}</strong>
                    <span className={s.badgeText}>{badge.text}</span>
                  </div>
                  <span className={s.badgeNumber}>{badge.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.mainFeatures} id="ventajas" aria-labelledby="features-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.advantages.eyebrow}</span>
              <h2 id="features-title">{copy.advantages.title}</h2>
              <p>{copy.advantages.lead}</p>
            </div>
            <div className={s.advantageGrid}>
              {copy.advantages.items.map((item) => (
                <article key={item.title} className={s.iconCard} data-reveal>
                  <div className={s.cardIcon}><Icon name={item.icon} /></div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.cardTypes} id="tarjetas" aria-labelledby="cards-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.cards.eyebrow}</span>
              <h2 id="cards-title">{copy.cards.title}</h2>
              <p>{copy.cards.lead}</p>
            </div>
            <div className={s.cardGrid}>
              {copy.cards.items.map((card) => (
                <article key={card.title} className={s.loyaltyCard} data-reveal>
                  <div className={s.cardPreview}>
                    <div className={s.cardScreen}>
                      <Image src={card.image} alt={card.alt} width={944} height={2048} sizes="(max-width: 480px) 90vw, (max-width: 809px) 45vw, 380px" />
                    </div>
                  </div>
                  <div className={s.cardCopy}>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.process} id="proceso" aria-labelledby="process-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.process.eyebrow}</span>
              <h2 id="process-title">{copy.process.title}</h2>
              <p>{copy.process.lead}</p>
            </div>
            <div className={s.processBox} data-reveal>
              <ProcessSteps copy={copy} />
              <ContactButton className={`${s.button} ${s.processCta}`}>{copy.hero.cta}</ContactButton>
            </div>
          </div>
        </section>

        <section className={s.statistics} id="resultados" aria-labelledby="statistics-title">
          <div className={`${s.container} ${s.statisticsInner}`} data-reveal>
            <h2 id="statistics-title">{copy.stats.title}</h2>
            <StatCounters copy={copy} />
          </div>
        </section>

        <section className={s.benefits} id="beneficios" aria-labelledby="benefits-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.benefits.eyebrow}</span>
              <h2 id="benefits-title">{copy.benefits.title}</h2>
              <p>{copy.benefits.lead}</p>
            </div>
            <div className={s.benefitGrid} data-reveal>
              {copy.benefits.items.map((item) => (
                <article key={item.title} className={s.iconCard}>
                  <div className={s.cardIcon}><Icon name={item.icon} /></div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.comparison} id="comparativo" aria-labelledby="comparison-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.comparison.eyebrow}</span>
              <h2 id="comparison-title">{copy.comparison.title}</h2>
              <p>{copy.comparison.lead}</p>
            </div>
            <div className={s.comparisonGrid} data-reveal>
              {([["before", "sad"], ["after", "smile"]] as const).map(([side, icon]) => (
                <article key={side} className={`${s.comparisonCard} ${side === "after" ? s.dark : ""}`}>
                  <h3>{copy.comparison[side].title}</h3>
                  <ul className={s.comparisonList}>
                    {copy.comparison[side].items.map((item) => <li key={item}><Icon name={icon} className={s.comparisonIcon} />{item}</li>)}
                  </ul>
                  <ContactButton className={s.button}>{copy.comparison[side].cta}</ContactButton>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.pricing} id="precios" aria-labelledby="pricing-title">
          <div className={s.container}>
            <div className={s.sectionHeading} data-reveal>
              <span className={s.eyebrow}>{copy.pricing.eyebrow}</span>
              <h2 id="pricing-title">{copy.pricing.title}</h2>
              <p>{copy.pricing.lead}</p>
            </div>
            <div className={s.pricingInner} data-reveal>
              <Pricing copy={copy} />
            </div>
          </div>
        </section>
      </main>

      <footer className={s.siteFooter} id="contacto">
        <div className={s.footerInner}>
          <div className={s.footerBrandCol}>
            <a href="#inicio" className={s.brand} aria-label={copy.nav.homeLabel}>
              <Image src="/brand/logo-white.svg" alt="" width={160} height={57} className={s.footerLogo} />
            </a>
            <p className={s.footerTagline}>{copy.footer.tagline}</p>
          </div>
          <div className={s.footerNavCols}>
            <div className={s.footerColGroup}>
              <span className={s.footerColTitle}>{copy.footer.social}</span>
              <a href="https://www.instagram.com/cirix.io" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.tiktok.com/@cirix.io" target="_blank" rel="noopener noreferrer">TikTok</a>
            </div>
            <div className={s.footerColGroup}>
              <span className={s.footerColTitle}>{copy.footer.legal}</span>
              <LocalizedLink href="/privacy">{copy.footer.privacy}</LocalizedLink>
            </div>
          </div>
          <div className={s.footerContactCol}>
            <span className={s.footerColTitle}>{copy.footer.contactTitle}</span>
            <p>{copy.footer.contactText}</p>
            <ContactButton className={s.button}>{copy.footer.contactCta}</ContactButton>
          </div>
        </div>
        <div className={s.footerBottomBar}>
          <span>&copy; {new Date().getFullYear()} CIRIX. {copy.footer.rights}</span>
        </div>
      </footer>

      <ContactDialog copy={copy} />
    </div>
  );
}
