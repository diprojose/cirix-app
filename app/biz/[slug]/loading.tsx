/**
 * Shown under the panel's menu the instant a section is opened, while the
 * server prepares it. The menu itself never disappears.
 */
export default function BusinessSectionLoading() {
  return (
    <main aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only" role="status">Cargando… / Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded-xl bg-surface" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-lg bg-surface" />
      <div className="h-40 w-full animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-surface" />
    </main>
  );
}
