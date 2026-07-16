import Link from "next/link";

/**
 * SiteFooter is the desktop/web footer (hidden below `md`, where the mobile app
 * uses the floating BottomNav instead). It carries the brand blurb and the
 * secondary link set expected of a web storefront.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 hidden border-t border-border bg-surface md:block">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10 text-sm text-text-muted md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <p className="text-lg font-bold text-text">mixmag</p>
          <p className="mt-2">
            Postres por encargo y artículos de tu supermercado, en un solo lugar.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-12 gap-y-2">
          <Link href="/" className="hover:text-accent">
            Tienda
          </Link>
          <Link href="/premium" className="hover:text-accent">
            Recetas premium
          </Link>
          <Link href="/login" className="hover:text-accent">
            Iniciar sesión
          </Link>
          <Link href="/offline" className="hover:text-accent">
            Sin conexión
          </Link>
        </nav>
        <p className="text-xs">© mixmag</p>
      </div>
    </footer>
  );
}
