"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LeafIcon,
  ClockIcon,
  BagIcon,
  ChevronRightIcon,
  LocationIcon,
} from "../ui/icons";
import { useDemo } from "./provider";
import { Shell, ProductCard, ProductImage, Quantity, Empty, s } from "./ui";

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
      images: [
        "/products/brocoli.png",
        "/products/tomates.png",
        "/products/aguacate.png",
      ],
      detail: t("Tus favoritos", "Your favorites"),
    },
    {
      id: "vegetables",
      es: "Verduras frescas",
      en: "Fresh vegetables",
      images: ["/products/brocoli.png"],
      detail: t("Del campo a tu mesa", "Farm to table"),
    },
    {
      id: "fruit",
      es: "Frutas",
      en: "Fruit",
      images: ["/products/aguacate.png"],
      detail: t("En su mejor momento", "Perfectly ripe"),
    },
    {
      id: "bundles",
      es: "Packs familiares",
      en: "Family packs",
      images: ["/products/tomates.png", "/products/aguacate.png"],
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
      <section
        id="categorias"
        className={s.section}
        aria-labelledby="categories-heading"
      >
        <div className={s.sectionHeading}>
          <div>
            <p className={s.eyebrow}>
              {t("ENCUENTRA LO QUE TE GUSTA", "FIND YOUR FAVORITES")}
            </p>
            <h2 id="categories-heading">
              {t("Cada pasillo, a un clic", "Every aisle, a click away")}
            </h2>
          </div>
          <Link className={s.categoryBrowse} href={`${basePath}/home#catalogo`}>
            {t("Explorar el mercado", "Explore the market")}{" "}
            <ChevronRightIcon />
          </Link>
        </div>
        <div className={s.categories}>
          {categories.map((c) => {
            const count = state.products.filter(
              (product) => c.id === "all" || product.category === c.id,
            ).length;
            return (
              <Link
                key={c.id}
                className={`${s.category} ${category === c.id ? s.categoryActive : ""}`}
                data-category={c.id}
                href={`${basePath}/home${c.id === "all" ? "" : `?category=${c.id}`}#catalogo`}
                aria-current={category === c.id ? "true" : undefined}
              >
                <div className={s.categoryMedia}>
                  <span className={s.categoryCount}>
                    {count}{" "}
                    {t(
                      count === 1 ? "producto" : "productos",
                      count === 1 ? "product" : "products",
                    )}
                  </span>
                  {category === c.id && (
                    <span className={s.categorySelected} aria-hidden="true">
                      ✓
                    </span>
                  )}
                  <div
                    className={s.categoryProduce}
                    data-count={c.images.length}
                    aria-hidden="true"
                  >
                    {c.images.map((image) => (
                      <div key={image} className={s.categoryPhoto}>
                        <ProductImage product={{ name: "", imageUrl: image }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={s.categoryCaption}>
                  <div>
                    <h3>{t(c.es, c.en)}</h3>
                    <p>{c.detail}</p>
                  </div>
                  <span className={s.categoryArrow} aria-hidden="true">
                    <ChevronRightIcon />
                  </span>
                </div>
              </Link>
            );
          })}
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
  const saving = product
    ? Math.max(
        0,
        (product.previousPriceCents ?? product.priceCents) - product.priceCents,
      )
    : 0;
  const department =
    product?.category === "fruit"
      ? t("Frutas", "Fruit")
      : product?.category === "bundles"
        ? t("Packs familiares", "Family packs")
        : t("Verduras frescas", "Fresh vegetables");
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
          <nav
            className={s.breadcrumb}
            aria-label={t("Ruta de navegación", "Breadcrumb")}
          >
            <Link href={`${basePath}/home`}>{t("Tienda", "Store")}</Link>
            <ChevronRightIcon />
            <Link
              href={`${basePath}/home?category=${product.category}#catalogo`}
            >
              {department}
            </Link>
            <ChevronRightIcon />
            <span aria-current="page">{product.name}</span>
          </nav>
          <section className={s.detail} aria-labelledby="product-title">
            <div className={s.detailImage}>
              <div className={s.detailImageTop}>
                <span className={s.detailImageLabel}>
                  <LeafIcon />
                  {t("Selección del mercado", "Market selection")}
                </span>
                {saving > 0 && (
                  <span className={s.detailDiscount}>
                    −{Math.round((saving / product.previousPriceCents!) * 100)}%
                  </span>
                )}
              </div>
              <div className={s.detailImageStage}>
                <ProductImage
                  key={product.imageUrl}
                  product={product}
                  priority
                />
              </div>
              <div className={s.detailImageBottom}>
                <span>{department}</span>
                <span className={s.detailUnit}>
                  <BagIcon />
                  {product.unit}
                </span>
              </div>
            </div>
            <div className={s.detailInfo}>
              <div className={s.detailHeading}>
                <span className={s.eyebrow}>
                  {t(
                    "DE TU MERCADO A TU MESA",
                    "FROM YOUR MARKET TO YOUR TABLE",
                  )}
                </span>
                <h1 id="product-title">{product.name}</h1>
                <div className={s.detailMeta}>
                  <span className={s.detailUnit}>{product.unit}</span>
                  <span
                    className={s.detailAvailability}
                    data-available={product.available}
                  >
                    {product.available
                      ? t("Disponible para tu compra", "Available to order")
                      : t("Temporalmente agotado", "Temporarily unavailable")}
                  </span>
                </div>
              </div>
              <p className={s.detailDescription}>{product.description}</p>
              <div className={s.detailPriceBlock}>
                <span className={s.detailPrice}>
                  {money(product.priceCents)}
                </span>
                {saving > 0 && <del>{money(product.previousPriceCents!)}</del>}
                <span className={s.detailPriceUnit}>/ {product.unit}</span>
                {saving > 0 && (
                  <span className={s.detailSaving}>
                    {t("Ahorras", "Save")} {money(saving)}
                  </span>
                )}
              </div>
              <div className={s.detailPurchase}>
                <div className={s.detailPurchaseActions}>
                  <Quantity product={product} variant="detail" />
                  <Link className={s.detailCartLink} href={`${basePath}/cart`}>
                    {t("Ver carrito", "View cart")}
                    <ChevronRightIcon />
                  </Link>
                </div>
                <p className={s.detailCartStatus} aria-live="polite">
                  {state.cart[product.id]
                    ? t(
                        `${state.cart[product.id]} en tu carrito · ${money(product.priceCents * state.cart[product.id])}`,
                        `${state.cart[product.id]} in your cart · ${money(product.priceCents * state.cart[product.id])}`,
                      )
                    : t(
                        "Elige tus favoritos y completa tu compra cuando quieras.",
                        "Pick your favorites and check out when you're ready.",
                      )}
                </p>
              </div>
              <Link className={s.detailRewards} href={`${basePath}/billetera`}>
                <span className={s.detailRewardIcon}>
                  <LeafIcon />
                </span>
                <span>
                  <strong>
                    {t(
                      "Lo fresco también te recompensa",
                      "Fresh picks come with rewards",
                    )}
                  </strong>
                  <small>
                    {t(
                      "Acumula saldo para tus próximas compras.",
                      "Collect credit for your next shop.",
                    )}
                  </small>
                </span>
                <ChevronRightIcon />
              </Link>
              <div className={s.detailServices}>
                <div>
                  <LocationIcon />
                  <span>
                    <strong>
                      {t("Como tú prefieras", "Your way to shop")}
                    </strong>
                    <small>
                      {t(
                        "Delivery o retiro en tienda",
                        "Delivery or store pickup",
                      )}
                    </small>
                  </span>
                </div>
                <div>
                  <BagIcon />
                  <span>
                    <strong>{t("Compra demo", "Demo checkout")}</strong>
                    <small>{t("Sin cobros reales", "No real charges")}</small>
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className={s.section}>
            <div className={s.sectionHeading}>
              <div>
                <p className={s.eyebrow}>
                  {t("JUNTOS SABEN MEJOR", "BETTER TOGETHER")}
                </p>
                <h2>{t("Completa tu compra", "Complete your shop")}</h2>
              </div>
              <Link
                className={s.categoryBrowse}
                href={`${basePath}/home#catalogo`}
              >
                {t("Ver todo", "View all")}
                <ChevronRightIcon />
              </Link>
            </div>
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
