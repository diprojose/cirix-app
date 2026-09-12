import { getViewer } from "./dal";

/*
 * Orders always require platform admission. Legacy unowned orders retain their
 * capability URL within the private platform. Account-bound orders additionally
 * require their owner or a current operator, at both read and mutation boundaries.
 */

/** Whether the current viewer may read and act on an order with this owner. */
export async function canAccessOrder(customerUid: string | null): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer.authenticated) return false;
  // Legacy unowned order: only an admitted viewer possessing the URL can open it.
  if (customerUid === null) {
    return true;
  }
  return viewer.permissions.canOperateStore || viewer.uid === customerUid;
}
