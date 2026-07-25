import { getViewer } from "./dal";

/*
 * Authorization rule for order URLs, shared by the order page and the payment
 * report action so both borders answer the same question.
 *
 * Orders are reached by capability URL: the random order id is the credential,
 * which is what makes guest checkout possible — a visitor with no account still
 * has to be able to open their own receipt. Once an order is bound to a
 * registered account (`customerUid`), though, the URL alone stops being enough:
 * only that account, or a store operator, may open it or write a payment report
 * on it. A link that leaks (shared device, chat history, logs) then exposes
 * nothing and, more importantly, grants no writes.
 */

/** Whether the current viewer may read and act on an order with this owner. */
export async function canAccessOrder(customerUid: string | null): Promise<boolean> {
  // Guest order: nobody owns it, so the unguessable id is the only credential.
  if (customerUid === null) {
    return true;
  }
  const viewer = await getViewer();
  return viewer.permissions.canOperateStore || viewer.uid === customerUid;
}
