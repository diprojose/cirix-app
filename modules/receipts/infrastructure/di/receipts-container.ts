import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { PointsRepository, ReceiptLedger, ReceiptSettingsRepository } from "../../domain/ports/receipt-ports";
import {
  FirestorePointsRepository,
  FirestoreReceiptLedger,
  FirestoreReceiptSettingsRepository,
} from "../persistence/firestore-receipt-repositories";
import { CrmReceiptActivityLog, CrmReceiptCustomers, StampCardRewards } from "../adapters/module-adapters";
import { ScanReceipt } from "../../application/use-cases/scan-receipt";
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
    new CrmReceiptActivityLog()
  );
};

export const makeGetReceiptSettings = (): GetReceiptSettings => new GetReceiptSettings(settingsRepository());
export const makeSaveReceiptSettings = (): SaveReceiptSettings => new SaveReceiptSettings(settingsRepository());
export const makeListRecentReceipts = (): ListRecentReceipts => new ListRecentReceipts(receiptLedger());
export const makeGetPointsSummary = (): GetPointsSummary => new GetPointsSummary(pointsRepository());
export const makeListPointsBalances = (): ListPointsBalances => new ListPointsBalances(pointsRepository());
