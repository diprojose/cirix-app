"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { LeafIcon, ClockIcon, BagIcon } from "../ui/icons";
import { useDemo } from "./provider";
import {
  Shell,
  ProductCard,
  ProductImage,
  Quantity,
  Empty,
  Heading,
  s,
} from "./ui";

export function Storefront() {
  const { state, basePath, t } = useDemo();
  const params = useSearchParams();
  const [sort, setSort] = useState("featured");
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const offers = params.get("offers") === "1";
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const products = state.products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!offers || (p.previousPriceCents ?? 0) > p.priceCents) &&
        normalize(`${p.name} ${p.description}`).includes(normalize(q)),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.priceCents - b.priceCents
        : sort === "high"
          ? b.priceCents - a.priceCents
          : Number(b.featured) - Number(a.featured),
    );
  const categories = [
    {
      id: "all",
      es: "Todo el mercado",
      en: "All groceries",
      image: "/products/tomates.png",
      detail: t("Tus favoritos", "Your favorites"),
    },
    {
      id: "vegetables",
      es: "Verduras frescas",
      en: "Fresh vegetables",
      image: "/products/brocoli.png",
      detail: t("Del campo a tu mesa", "Farm to table"),
    },
    {
      id: "fruit",
      es: "Frutas",
      en: "Fruit",
      image: "/products/aguacate.png",
      detail: t("En su mejor momento", "Perfectly ripe"),
    },
    {
      id: "bundles",
      es: "Packs para compartir",
      en: "Family packs",
      image: "/products/zanahorias.png",
      detail: t("Más para tu semana", "More for your week"),
    },
  ];
  const filtered = q || category !== "all" || offers;
  return (
    <Shell>
      {!filtered && (
        <>
          <section className={s.hero}>
            <div className={s.heroCopy}>
              <span className={s.heroBadge}>
                <LeafIcon />
                {t("BUENO PARA TI, TODOS LOS DÍAS", "GOOD FOOD, EVERY DAY")}
              </span>
              <h1>{state.brand.heroTitle}</h1>
              <p>{state.brand.heroSubtitle}</p>
              <Link className={s.heroButton} href="#catalogo">
                {t("Hacer mi compra", "Start shopping")} <span>↗</span>
              </Link>
              <div className={s.heroFoot}>
                <span>✦ {t("Productos frescos", "Fresh picks")}</span>
                <span>
                  ✦ {t("Beneficios en cada compra", "Rewards every time")}
                </span>
              </div>
            </div>
            <div className={s.heroArt} aria-hidden="true">
              <div className={s.heroCircle} />
              <div className={s.heroTomato}>
                <ProductImage
                  product={{ name: "", imageUrl: "/products/tomates.png" }}
                  priority
                />
              </div>
              <div className={s.heroAvocado}>
                <ProductImage
                  product={{ name: "", imageUrl: "/products/aguacate.png" }}
                  priority
                />
              </div>
              <div className={s.heroBroccoli}>
                <ProductImage
                  product={{ name: "", imageUrl: "/products/brocoli.png" }}
                />
              </div>
              <span className={s.heroSticker}>
                {t("Fresco", "Fresh")}
                <small>{t("por naturaleza", "by nature")}</small>
              </span>
            </div>
          </section>
          <div className={s.trustStrip}>
            <span>
              <LeafIcon />
              <b>{t("Calidad que se nota", "Quality you can taste")}</b>
              {t("Seleccionado para ti", "Selected for you")}
            </span>
            <span>
              <BagIcon />
              <b>{t("A tu manera", "Your way to shop")}</b>
              {t("Delivery o retiro en tienda", "Delivery or store pickup")}
            </span>
            <span>
              <ClockIcon />
              <b>{t("Tu compra vale más", "Your shop gives back")}</b>
              {t("Acumula saldo en recompensas", "Collect reward credit")}
            </span>
          </div>
        </>
      )}
      <section id="categorias" className={s.section}>
        <div className={s.sectionHeading}>
          <div>
            <p className={s.eyebrow}>
              {t("ENCUENTRA LO QUE TE GUSTA", "FIND YOUR FAVORITES")}
            </p>
            <h2>{t("Cada pasillo, a un clic", "Every aisle, a click away")}</h2>
          </div>
          <Link href={`${basePath}/home#catalogo`}>
            {t("Ver todo", "View all")} ↗
          </Link>
        </div>
        <div className={s.categories}>
          {categories.map((c) => (
            <Link
              key={c.id}
              className={`${s.category} ${category === c.id ? s.categoryActive : ""}`}
              href={`${basePath}/home${c.id === "all" ? "" : `?category=${c.id}`}#catalogo`}
              aria-current={category === c.id ? "true" : undefined}
            >
              <div>
                <b>{t(c.es, c.en)}</b>
                <small>{c.detail}</small>
                <span>↗</span>
              </div>
              <ProductImage product={{ name: "", imageUrl: c.image }} />
            </Link>
          ))}
        </div>
      </section>
      <section id="catalogo" className={s.section}>
        <div className={s.sectionHeading}>
          <div>
            <p className={s.eyebrow}>
              {t(
                "LLENA TU SEMANA DE FRESCURA",
                "FILL YOUR WEEK WITH FRESHNESS",
              )}
            </p>
            <h2>
              {q
                ? t(`Resultados para “${q}”`, `Results for “${q}”`)
                : offers
                  ? t("Ofertas de la semana", "Weekly offers")
                  : t("Lo fresco de hoy", "Today's fresh picks")}
            </h2>
          </div>
          <label className={s.sort}>
            {t("Ordenar", "Sort")}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">{t("Destacados", "Featured")}</option>
              <option value="low">{t("Menor precio", "Lowest price")}</option>
              <option value="high">{t("Mayor precio", "Highest price")}</option>
            </select>
          </label>
        </div>
        <div className={s.filterRow}>
          <span aria-live="polite">
            {products.length} {t("productos", "products")}
          </span>
          {filtered && (
            <Link className={s.chip} href={`${basePath}/home#catalogo`}>
              {t("Limpiar filtros", "Clear filters")} ×
            </Link>
          )}
          <Link className={s.chip} href={`${basePath}/home?offers=1#catalogo`}>
            {t("Solo ofertas", "Offers only")}
          </Link>
        </div>
        {products.length ? (
          <div className={s.productGrid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <Empty
            title={t("No encontramos esos productos", "No products found")}
            detail={t(
              "Prueba con otro nombre o limpia los filtros.",
              "Try a different name or clear the filters.",
            )}
          />
        )}
      </section>
      <section className={s.benefitBanner}>
        <div className={s.benefitSeal}>
          <LeafIcon />
        </div>
        <div>
          <p className={s.eyebrow}>
            {t("TU LEALTAD TIENE BENEFICIOS", "LOYALTY HAS ITS REWARDS")}
          </p>
          <h2>
            {t(
              "Tu próxima compra empieza con una recompensa.",
              "Your next shop starts with a reward.",
            )}
          </h2>
          <p>
            {t(
              "Compra, acumula saldo y úsalo en tus próximos pedidos.",
              "Shop, collect credit and use it on future orders.",
            )}
          </p>
        </div>
        <Link className={s.primary} href={`${basePath}/billetera`}>
          {t("Conocer mis beneficios", "Explore my rewards")} →
        </Link>
      </section>
    </Shell>
  );
}

export function ProductDetail({ id }: { id: string }) {
  const { state, basePath, money, t } = useDemo();
  const product = state.products.find((p) => p.id === id);
  return (
    <Shell>
      {!product ? (
        <Empty
          title={t("Producto no encontrado", "Product not found")}
          detail={t(
            "Puede haber sido eliminado del demo.",
            "It may have been removed from this demo.",
          )}
        />
      ) : (
        <>
          <p className={s.breadcrumb}>
            <Link href={`${basePath}/home`}>{t("Tienda", "Store")}</Link> /{" "}
            {product.name}
          </p>
          <section className={s.detail}>
            <div className={s.detailImage}>
              <ProductImage product={product} />
            </div>
            <div>
              <Heading
                eyebrow={t("FRESCO Y SELECCIONADO", "FRESH AND SELECTED")}
                title={product.name}
              />
              <p className={s.muted}>{product.unit}</p>
              <p className={s.detailPrice}>{money(product.priceCents)}</p>
              <p>{product.description}</p>
              <div className={s.detailPurchase}>
                <Quantity product={product} />
              </div>
              <p className={s.rewardHint}>
                <LeafIcon />
                {t(
                  "Esta compra suma beneficios a tu billetera.",
                  "This purchase earns rewards for your wallet.",
                )}
              </p>
              <Link href={`${basePath}/cart`}>
                {t("Ver mi carrito", "View my cart")} →
              </Link>
            </div>
          </section>
          <section className={s.section}>
            <h2>{t("Completa tu compra", "Complete your shop")}</h2>
            <div className={s.productGrid}>
              {state.products
                .filter((p) => p.id !== id && p.available)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
