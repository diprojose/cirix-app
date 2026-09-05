import NotificationsPage from "@/app/notificaciones/page";

export { metadata } from "@/app/notificaciones/page";

export default async function BrandedNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { brandSlug } = await params;
  return (
    <NotificationsPage
      basePath={`/demo/${brandSlug}`}
      searchParams={searchParams}
    />
  );
}
