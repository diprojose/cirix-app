import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type {
  PendingReceiptSigner,
  PointsRepository,
  ReceiptLedger,
  ReceiptSettingsRepository,
  RedemptionRepository,
  RewardCatalog,
} from "../../domain/ports/receipt-ports";
import {
  FirestorePointsRepository,
  FirestoreReceiptDemoLog,
  FirestoreReceiptLedger,
  FirestoreReceiptSettingsRepository,
  FirestoreRedemptionRepository,
  FirestoreRewardCatalog,
} from "../persistence/firestore-receipt-repositories";
import { CrmCustomerNames, CrmReceiptActivityLog, CrmReceiptCustomers, CrmRedemptionActivityLog, StampCardRewards } from "../adapters/module-adapters";
import { HmacPendingReceiptSigner } from "../crypto/hmac-pending-receipt-signer";
import { ConfirmReceipt, ScanReceipt } from "../../application/use-cases/scan-receipt";
import {
  CancelRedemption,
  DeleteReward,
  DeliverRedemption,
  ListMyRedemptions,
  ListRecentRedemptions,
  ListRewards,
  PreviewRedemption,
  RedeemPoints,
  SaveReward,
} from "../../application/use-cases/reward-use-cases";
import {
  GetPointsSummary,
  GetReceiptSettings,
  ListPointsBalances,
  ListRecentReceipts,
  SaveReceiptSettings,
} from "../../application/use-cases/receipt-queries";

/* Composition root for receipts: the only place that knows the concrete adapters. Server-only. */

let settings: ReceiptSettingsRepository | null = null;
let ledger: ReceiptLedger | null = null;
let points: PointsRepository | null = null;

const settingsRepository = () => (settings ??= new FirestoreReceiptSettingsRepository(adminFirestore()));
const receiptLedger = () => (ledger ??= new FirestoreReceiptLedger(adminFirestore()));
const pointsRepository = () => (points ??= new FirestorePointsRepository(adminFirestore()));
let catalog: RewardCatalog | null = null;
let redemptions: RedemptionRepository | null = null;
const rewardCatalog = () => (catalog ??= new FirestoreRewardCatalog(adminFirestore()));
const redemptionRepository = () => (redemptions ??= new FirestoreRedemptionRepository(adminFirestore()));
let signer: PendingReceiptSigner | null = null;
/** Shares STAMP_QR_SECRET with the customer QR codes; each signs under its own prefix. */
const pendingSigner = () => (signer ??= new HmacPendingReceiptSigner(process.env.STAMP_QR_SECRET ?? ""));

/**
 * Builds the "scan my receipt" use case (customer action). The OCR engine is
 * imported here, on demand, so the pages that only read settings or balances do
 * not load it.
 */
export const makeScanReceipt = async (): Promise<ScanReceipt> => {
  const { TesseractReceiptReader } = await import("../ocr/tesseract-receipt-reader");
  return new ScanReceipt(
    settingsRepository(),
    new CrmReceiptCustomers(),
    new TesseractReceiptReader(),
    receiptLedger(),
    pointsRepository(),
    new StampCardRewards(),
    pendingSigner(),
    new FirestoreReceiptDemoLog(adminFirestore())
  );
};

/** The customer confirms the total a scan read. Needs no OCR. */
export const makeConfirmReceipt = (): ConfirmReceipt =>
  new ConfirmReceipt(
    settingsRepository(),
    new CrmReceiptCustomers(),
    receiptLedger(),
    pointsRepository(),
    new StampCardRewards(),
    new CrmReceiptActivityLog(),
    pendingSigner()
  );

export const makeGetReceiptSettings = (): GetReceiptSettings => new GetReceiptSettings(settingsRepository());
export const makeSaveReceiptSettings = (): SaveReceiptSettings => new SaveReceiptSettings(settingsRepository());
export const makeListRecentReceipts = (): ListRecentReceipts => new ListRecentReceipts(receiptLedger());
export const makeGetPointsSummary = (): GetPointsSummary => new GetPointsSummary(pointsRepository());
export const makeListPointsBalances = (): ListPointsBalances => new ListPointsBalances(pointsRepository());
export const makeListRewards = (): ListRewards => new ListRewards(rewardCatalog());
export const makeSaveReward = (): SaveReward => new SaveReward(rewardCatalog());
export const makeDeleteReward = (): DeleteReward => new DeleteReward(rewardCatalog());
export const makeRedeemPoints = (): RedeemPoints => new RedeemPoints(rewardCatalog(), new CrmReceiptCustomers(), redemptionRepository());
export const makeCancelRedemption = (): CancelRedemption => new CancelRedemption(redemptionRepository());
export const makeListMyRedemptions = (): ListMyRedemptions => new ListMyRedemptions(redemptionRepository());
export const makeListRecentRedemptions = (): ListRecentRedemptions => new ListRecentRedemptions(redemptionRepository());
export const makePreviewRedemption = (): PreviewRedemption => new PreviewRedemption(redemptionRepository(), new CrmCustomerNames());
export const makeDeliverRedemption = (): DeliverRedemption =>
  new DeliverRedemption(redemptionRepository(), new CrmCustomerNames(), new CrmRedemptionActivityLog());
