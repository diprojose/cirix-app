import "server-only";
import { getViewer } from "./dal";

/** Defense in depth for direct handler execution and future Proxy changes. */
export async function checkApiAccess(operatorOnly = false): Promise<Response | null> {
  const viewer = await getViewer();
  if (!viewer.authenticated) {
    return Response.json({ error: { code: "iam/access-denied" } }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  if (operatorOnly && !viewer.permissions.canOperateStore) {
    return Response.json({ error: { code: "iam/operator-required" } }, {
      status: 403, headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}
