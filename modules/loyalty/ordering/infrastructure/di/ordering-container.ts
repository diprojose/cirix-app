import "server-only";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { getProductRepository } from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import type { DeliveryZoneCatalog } from "../../domain/repositories/delivery-zone-catalog";
import { FirestoreOrderRepository } from "../persistence/firestore-order-repository";
import { StaticDeliveryZoneCatalog } from "../config/delivery-zones";
import { PlaceOrder } from "../../application/use-cases/place-order";
import { GetOrderById } from "../../application/use-cases/get-order-by-id";
import { ReportPayment } from "../../application/use-cases/report-payment";
import { ListDeliveryZones } from "../../application/use-cases/list-delivery-zones";
import { ListOrders } from "../../application/use-cases/list-orders";
import { ReviewPayment } from "../../application/use-cases/review-payment";
import { AdvanceOrderStatus } from "../../application/use-cases/advance-order-status";
import { ApplyOrderDiscount } from "../../application/use-cases/apply-order-discount";

/*
 * Composition root for the ordering module. This is the single place that
 * knows about concrete adapters: Firestore for orders, static config for
 * delivery zones, and the catalog context's repository for re-pricing lines.
 * Swapping persistence means changing only this file. Server-only: orders are
 * never touched from the client.
 */

let orderRepository: OrderRepository | null = null;

/** The Firestore-backed order repository, created lazily so importing the
 * container does not require Firebase credentials at build time. */
function getOrderRepository(): OrderRepository {
  orderRepository ??= new FirestoreOrderRepository(adminFirestore());
  return orderRepository;
}

const deliveryZoneCatalog: DeliveryZoneCatalog = new StaticDeliveryZoneCatalog();

/** Builds the "place order" use case with its dependencies wired. */
export const makePlaceOrder = (): PlaceOrder =>
  new PlaceOrder(getOrderRepository(), getProductRepository(), deliveryZoneCatalog);

/** Builds the "get order by id" use case with its dependencies wired. */
export const makeGetOrderById = (): GetOrderById => new GetOrderById(getOrderRepository());

/** Builds the "report payment" use case with its dependencies wired. */
export const makeReportPayment = (): ReportPayment =>
  new ReportPayment(getOrderRepository());

/** Builds the "list delivery zones" use case with its dependencies wired. */
export const makeListDeliveryZones = (): ListDeliveryZones =>
  new ListDeliveryZones(deliveryZoneCatalog);

/** Builds the "list orders" use case (operator queue). */
export const makeListOrders = (): ListOrders => new ListOrders(getOrderRepository());

/** Builds the "review payment" use case (operator action). */
export const makeReviewPayment = (): ReviewPayment =>
  new ReviewPayment(getOrderRepository());

/** Builds the "advance order status" use case (operator action). */
export const makeAdvanceOrderStatus = (): AdvanceOrderStatus =>
  new AdvanceOrderStatus(getOrderRepository());

/** Builds the "apply order discount" use case (wallet redemption at checkout). */
export const makeApplyOrderDiscount = (): ApplyOrderDiscount =>
  new ApplyOrderDiscount(getOrderRepository());
