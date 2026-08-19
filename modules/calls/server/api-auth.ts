import { getViewer } from "@/lib/auth/dal";

export async function authorizeCallsApi(): Promise<Response | null> {
  const viewer = await getViewer();
  if (!viewer.authenticated) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!viewer.permissions.canOperateStore) return Response.json({ error: "forbidden" }, { status: 403 });
  return null;
}

