import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { localizeForCurrentRequest } from "@/lib/i18n";
import {
  makeListNotifications,
  makeGetNotificationPrefs,
} from "@/modules/loyalty/notifications/infrastructure/di/notifications-container";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { SubHeader } from "@/components/store/sub-header";
import { CONTAINER_READ } from "@/components/store/layout";
import {
  saveNotificationPrefsAction,
  markNotificationsReadAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Notificaciones",
  description: "Tus avisos y preferencias de notificación.",
};

/** Short Spanish date for a notification. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

/**
 * Notifications page: the customer's in-app inbox plus their channel preferences
 * (US-H4). `requireCustomer` is the wall; everything is read and written scoped
 * to the signed-in viewer's own uid. In-app is the delivered channel today; push
 * and email are opt-in flags stored for when their senders are wired.
 */
export default async function NotificationsPage({
  searchParams,
  basePath = null,
}: {
  searchParams: Promise<{ saved?: string }>;
  basePath?: string | null;
}) {
  const viewer = await getViewer();
  const uid = viewer.uid;
  const notificationsPath = `${basePath ?? ""}/notificaciones`;
  if (!uid || !viewer.permissions.canPlaceOrders) {
    const returnTo = await localizeForCurrentRequest(notificationsPath);
    const loginPath = basePath ? `${basePath}/login` : "/login";
    redirect(
      await localizeForCurrentRequest(
        `${loginPath}?from=${encodeURIComponent(returnTo)}`
      )
    );
  }
  const { saved } = await searchParams;

  const [navViewer, listResult, prefsResult] = await Promise.all([
    getViewer(),
    makeListNotifications().execute({ customerUid: uid }),
    makeGetNotificationPrefs().execute({ customerUid: uid }),
  ]);
  const notifications = listResult.ok ? listResult.value : [];
  const prefs = prefsResult.ok ? prefsResult.value : { inApp: true, push: false, email: false };
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={navViewer} />

      <SubHeader title="Notificaciones" />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} space-y-6 pt-4 md:pt-8`}>
          <h2 className="hidden text-display font-bold text-text md:block">Notificaciones</h2>

          {saved && (
            <p className="rounded-xl bg-action-fill/10 px-4 py-3 text-sm font-medium text-action-strong">
              Preferencias guardadas.
            </p>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">Avisos</h2>
              {hasUnread && (
                <form action={markNotificationsReadAction}>
                  <input type="hidden" name="returnTo" value={notificationsPath} />
                  <button type="submit" className="text-xs font-semibold text-action-strong">
                    Marcar leídas
                  </button>
                </form>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`rounded-2xl px-4 py-3 shadow-xs ${
                      notification.read ? "bg-surface" : "bg-action-fill/5 ring-1 ring-action-fill/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-text">{notification.title}</p>
                      <span className="shrink-0 text-xs text-text-muted">
                        {shortDate(notification.createdAt)}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="mt-0.5 text-sm text-text-muted">{notification.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
            <h2 className="text-sm font-bold text-text">Preferencias</h2>
            <form action={saveNotificationPrefsAction} className="space-y-3">
              <input type="hidden" name="returnTo" value={notificationsPath} />
              <PrefRow name="inApp" label="En la app" checked={prefs.inApp} />
              <PrefRow name="push" label="Push (próximamente)" checked={prefs.push} />
              <PrefRow name="email" label="Email (próximamente)" checked={prefs.email} />
              <button
                type="submit"
                className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95"
              >
                Guardar preferencias
              </button>
            </form>
          </section>
        </div>
      </main>

      <SiteFooter />
      <BottomNav canOperateStore={viewer.permissions.canOperateStore} />
    </div>
  );
}

/** One channel toggle row. */
function PrefRow({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-text">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-6 w-6 accent-action-fill"
      />
    </label>
  );
}
