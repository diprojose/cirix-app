import { Admin } from "@/modules/loyalty/demo/admin";

export default async function DemoAdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  return <Admin section={section} />;
}
