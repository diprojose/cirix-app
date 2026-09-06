"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BagIcon,
  LeafIcon,
  SearchIcon,
  UserIcon,
  WalletIcon,
  LocationIcon,
  PlusIcon,
  MinusIcon,
} from "../ui/icons";
import { useDemo } from "./provider";
import type { DemoProduct } from "./model";
import s from "./market.module.css";

export { s };
export function ProductImage({
  product,
  priority = false,
}: {
  product: Pick<DemoProduct, "name" | "imageUrl">;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={360}
      height={360}
      unoptimized
      priority={priority}
      onError={() => setFailed(true)}
      className={s.productImage}
    />
  ) : (
    <div className={s.imageFallback}>
      <LeafIcon />
      <span>{product.name}</span>
    </div>
  );
}
export function BrandLogo() {
  const { state, t } = useDemo();
  return (
    <div className={s.logo}>
      {state.brand.logoUrl ? (
        <Image
          src={state.brand.logoUrl}
          alt={state.brand.displayName}
          width={160}
          height={64}
          unoptimized
          className={s.logoImage}
        />
      ) : (
        <>
          <span className={s.logoMark}>
            <LeafIcon />
          </span>
          <span>
            {state.brand.displayName}
            <small>{t("TU MERCADO, CADA DÍA", "YOUR EVERYDAY MARKET")}</small>
          </span>
        </>
      )}
    </div>
  );
}
export function Shell({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { state, basePath, ready, storageError, t, money } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const count = Object.values(state.cart).reduce((a, b) => a + b, 0);
  const total = state.products.reduce(
    (sum, p) => sum + p.priceCents * (state.cart[p.id] ?? 0),
    0,
  );
  return (
    <div className={s.market}>
      <a href="#main-content" className={s.skip}>
        {t("Saltar al contenido", "Skip to content")}
      </a>
      <div className={s.announcement}>
        <span>
          <LeafIcon />
          {t(
            "Frescura que se disfruta. Compras que te recompensan.",
            "Fresh food. Everyday rewards.",
          )}
        </span>
        <Link href={`${basePath}/admin`}>
          {t("Explorar administrador demo", "Explore demo admin")} ↗
        </Link>
      </div>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link
            href={`${basePath}/home`}
            aria-label={t("Ir a la tienda", "Go to store")}
          >
            <BrandLogo />
          </Link>
          <form
            className={s.search}
            action={`${basePath}/home`}
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(
                `${basePath}/home?q=${encodeURIComponent(String(q ?? ""))}#catalogo`,
              );
            }}
          >
            <SearchIcon />
            <input
              name="q"
              aria-label={t("Buscar productos", "Search products")}
              placeholder={t(
                "¿Qué necesitas para tu semana?",
                "What do you need this week?",
              )}
            />
            <button aria-label={t("Buscar", "Search")}>↵</button>
          </form>
          <Link className={s.accountLink} href={`${basePath}/orders`}>
            <UserIcon />
            <span>
              {t("Mi cuenta", "My account")}
              <small>{t("Cliente demo", "Demo customer")}</small>
            </span>
          </Link>
          <Link className={s.cartLink} href={`${basePath}/cart`}>
            <BagIcon />
            <span>{money(total)}</span>
            <b aria-label={t(`${count} productos`, `${count} items`)}>
              {count}
            </b>
          </Link>
        </div>
        <nav
          className={s.nav}
          aria-label={t("Navegación de tienda", "Store navigation")}
        >
          <Link href={`${basePath}/home#categorias`}>
            {t("☰ Departamentos", "☰ Departments")}
          </Link>
          <Link href={`${basePath}/home?offers=1#catalogo`}>
            {t("Ofertas de la semana", "Weekly offers")}
          </Link>
          <Link href={`${basePath}/billetera`}>
            {t("Mis recompensas", "My rewards")}
          </Link>
          <Link href={`${basePath}/referidos`}>
            {t("Invita y comparte", "Invite a friend")}
          </Link>
          <span className={s.delivery}>
            <LocationIcon />
            {t("Delivery y retiro · demo", "Delivery & pickup · demo")}
          </span>
          <Link
            href={pathname.replace(
              /^\/(es|en)\//,
              pathname.startsWith("/es/") ? "/en/" : "/es/",
            )}
            hrefLang={pathname.startsWith("/es/") ? "en" : "es"}
          >
            {pathname.startsWith("/es/") ? "EN" : "ES"}
          </Link>
        </nav>
      </header>
      {storageError && (
        <p className={s.notice} role="status">
          {t(
            "No se pudo guardar en este navegador. Puedes seguir probando; los cambios durarán mientras esta página permanezca abierta.",
            "Browser storage is unavailable. You can keep exploring; changes last while this page stays open.",
          )}
        </p>
      )}
      {!ready ? (
        <main id="main-content" className={s.container} aria-busy="true">
          <div className={s.skeleton}>
            {t("Preparando tu mercado…", "Getting your market ready…")}
          </div>
        </main>
      ) : (
        <main
          id="main-content"
          tabIndex={-1}
          className={`${s.container} ${admin ? s.adminMain : ""}`}
        >
          {children}
        </main>
      )}
      <footer className={s.footer}>
        <div>
          <BrandLogo />
          <p>{state.brand.tagline}</p>
        </div>
        <div>
          <b>{t("Tu tienda", "Your store")}</b>
          <Link href={`${basePath}/home`}>{t("Comprar", "Shop")}</Link>
          <Link href={`${basePath}/orders`}>
            {t("Mis pedidos", "My orders")}
          </Link>
        </div>
        <div>
          <b>{t("Más por cada compra", "More with every shop")}</b>
          <Link href={`${basePath}/billetera`}>
            {t("Recompensas", "Rewards")}
          </Link>
          <Link href={`${basePath}/admin/settings`}>
            {t("Personalizar esta tienda", "Customize this store")}
          </Link>
        </div>
        <p className={s.footerNote}>
          {t(
            "Demo interactivo · compras y pagos simulados · tus cambios se guardan solo en este navegador.",
            "Interactive demo · simulated orders and payments · changes are saved in this browser only.",
          )}
        </p>
      </footer>
      <nav
        className={s.mobileNav}
        aria-label={t("Navegación móvil", "Mobile navigation")}
      >
        <Link href={`${basePath}/home`}>
          <LeafIcon />
          {t("Tienda", "Shop")}
        </Link>
        <Link href={`${basePath}/billetera`}>
          <WalletIcon />
          {t("Beneficios", "Rewards")}
        </Link>
        <Link href={`${basePath}/cart`}>
          <BagIcon />
          {t(`Carrito (${count})`, `Cart (${count})`)}
        </Link>
        <Link href={`${basePath}/admin`}>
          <UserIcon />
          Admin
        </Link>
      </nav>
    </div>
  );
}
export function Quantity({
  product,
  variant = "default",
}: {
  product: DemoProduct;
  variant?: "default" | "detail" | "card";
}) {
  const { state, dispatch, t } = useDemo();
  const qty = state.cart[product.id] ?? 0;
  const [error, setError] = useState<string | null>(null);
  const change = (quantity: number) =>
    setError(dispatch({ type: "quantity", id: product.id, quantity }));
  return (
    <div
      className={
        variant === "detail"
          ? s.detailQuantity
          : variant === "card"
            ? s.cardQuantity
            : undefined
      }
    >
      {qty ? (
        <div className={s.stepper}>
          <button
            onClick={() => change(qty - 1)}
            aria-label={t(
              `Quitar uno: ${product.name}`,
              `Remove one: ${product.name}`,
            )}
          >
            <MinusIcon />
          </button>
          <output aria-live="polite">{qty}</output>
          <button
            onClick={() => change(qty + 1)}
            disabled={!product.available || qty >= 99}
            aria-label={t(
              `Agregar uno: ${product.name}`,
              `Add one: ${product.name}`,
            )}
          >
            <PlusIcon />
          </button>
        </div>
      ) : (
        <button
          className={s.addButton}
          onClick={() => change(1)}
          disabled={!product.available}
          aria-label={
            variant === "detail"
              ? t(
                  `Agregar al carrito: ${product.name}`,
                  `Add to cart: ${product.name}`,
                )
              : t(`Agregar ${product.name}`, `Add ${product.name}`)
          }
        >
          {variant === "detail" ? <BagIcon /> : <PlusIcon />}
          {product.available
            ? variant === "detail"
              ? t("Agregar al carrito", "Add to cart")
              : t("Agregar", "Add")
            : t("Agotado", "Unavailable")}
        </button>
      )}
      {error && (
        <span role="alert" className={s.error}>
          {error}
        </span>
      )}
    </div>
  );
}
export function ProductCard({
  product,
  preview = false,
}: {
  product: DemoProduct;
  preview?: boolean;
}) {
  const { state, basePath, money, t } = useDemo();
  const offer =
    product.previousPriceCents &&
    product.previousPriceCents > product.priceCents;
  return (
    <article
      className={s.productCard}
      data-in-cart={!preview && Boolean(state.cart[product.id])}
      data-available={product.available}
    >
      <div className={s.productVisual}>
        {!product.available ? (
          <span className={s.freshTag}>{t("Agotado", "Unavailable")}</span>
        ) : offer ? (
          <span className={s.offerTag}>
            −
            {Math.round(
              (1 - product.priceCents / product.previousPriceCents!) * 100,
            )}
            %
          </span>
        ) : (
          <span className={s.freshTag}>
            <LeafIcon />
            {product.category === "bundles"
              ? t("Pack familiar", "Family pack")
              : t("Fresco", "Fresh")}
          </span>
        )}
        {!preview && Boolean(state.cart[product.id]) && (
          <span
            className={s.cardCartBadge}
            aria-label={t(
              `${state.cart[product.id]} en tu carrito`,
              `${state.cart[product.id]} in your cart`,
            )}
          >
            <BagIcon />
            {state.cart[product.id]}
          </span>
        )}
        {preview ? (
          <ProductImage key={product.imageUrl} product={product} />
        ) : (
          <Link href={`${basePath}/product/${product.id}`}>
            <ProductImage key={product.imageUrl} product={product} />
          </Link>
        )}
      </div>
      <div className={s.productInfo}>
        <div className={s.productHeading}>
          <h3>
            {preview ? (
              product.name
            ) : (
              <Link href={`${basePath}/product/${product.id}`}>
                {product.name}
              </Link>
            )}
          </h3>
          <span className={s.unit}>
            {product.unit} <span aria-hidden="true">·</span> USD
          </span>
        </div>
        <div className={s.cardPurchase}>
          <div className={s.price}>
            <strong aria-label={money(product.priceCents)}>
              {money(product.priceCents, true)}
            </strong>
            {offer && (
              <del
                aria-label={t(
                  `Antes ${money(product.previousPriceCents!)}`,
                  `Previously ${money(product.previousPriceCents!)}`,
                )}
              >
                {money(product.previousPriceCents!, true)}
              </del>
            )}
          </div>
          {preview ? (
            <span className={s.cardPreviewButton}>
              <PlusIcon />
              {t("Agregar", "Add")}
            </span>
          ) : (
            <Quantity product={product} variant="card" />
          )}
        </div>
        <p className={s.cardReward}>
          <LeafIcon />
          {t("Tu compra suma beneficios", "Earn rewards as you shop")}
        </p>
      </div>
    </article>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  const { t, basePath } = useDemo();
  return (
    <div className={s.empty}>
      <BagIcon />
      <h1>{title}</h1>
      <p>{detail}</p>
      <Link className={s.primary} href={`${basePath}/home`}>
        {t("Explorar productos", "Browse products")} →
      </Link>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.heading}>
      <div>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
