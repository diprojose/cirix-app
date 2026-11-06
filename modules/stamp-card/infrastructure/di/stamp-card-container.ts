import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import type { ScanTokenSigner } from "../../domain/ports/scan-token-signer";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { TableCodeRepository } from "../../domain/ports/table-code-repository";
import type { StampActivityReader } from "../../domain/ports/stamp-activity";
import {
  FirestoreStampActivityReader,
  FirestoreStampCardRepository,
  FirestoreStampProgramRepository,
  FirestoreTableCodeRepository,
} from "../persistence/firestore-stamp-repositories";
import { HmacScanTokenSigner } from "../crypto/hmac-scan-token-signer";
import { CrmActivityLog, CrmCustomerDirectory } from "../adapters/crm-adapters";
import { GetStampCard } from "../../application/use-cases/get-stamp-card";
import { IssueScanToken } from "../../application/use-cases/issue-scan-token";
import { PreviewScan } from "../../application/use-cases/preview-scan";
import { RecordStamp } from "../../application/use-cases/record-stamp";
import { RedeemReward } from "../../application/use-cases/redeem-reward";
import { GetStampProgram, SaveStampProgram } from "../../application/use-cases/stamp-program-use-cases";
import { ClaimTableStamp } from "../../application/use-cases/claim-table-stamp";
import { GrantReceiptStamp } from "../../application/use-cases/grant-receipt-stamp";
import { GetTableCode, RotateTableCode } from "../../application/use-cases/table-code-use-cases";
import { GetStampActivity, ListCardProgress } from "../../application/use-cases/owner-reports";

/*
 * Composition root for the stamp card module: the only place that knows the
 * concrete adapters (Firestore, HMAC signing, the CRM). Adapters are created
 * lazily so importing this needs no credentials at build time. Server-only.
 *
 * Needs STAMP_QR_SECRET (at least 32 characters) to sign customer QR codes;
 * without it the signer refuses to start and the routes answer 503.
 */

let cards: StampCardRepository | null = null;
let programs: StampProgramRepository | null = null;
let signer: ScanTokenSigner | null = null;
let directory: CustomerDirectory | null = null;
let activity: CustomerActivityLog | null = null;
let tableCodes: TableCodeRepository | null = null;
let activityReader: StampActivityReader | null = null;

const cardRepository = () => (cards ??= new FirestoreStampCardRepository(adminFirestore()));
const programRepository = () => (programs ??= new FirestoreStampProgramRepository(adminFirestore()));
const tokenSigner = () => (signer ??= new HmacScanTokenSigner(process.env.STAMP_QR_SECRET ?? ""));
const customerDirectory = () => (directory ??= new CrmCustomerDirectory());
const activityLog = () => (activity ??= new CrmActivityLog());
const tableCodeRepository = () => (tableCodes ??= new FirestoreTableCodeRepository(adminFirestore()));
const stampActivity = () => (activityReader ??= new FirestoreStampActivityReader(adminFirestore()));

/** Builds the "get my stamp card" use case. */
export const makeGetStampCard = (): GetStampCard =>
  new GetStampCard(cardRepository(), programRepository(), customerDirectory());

/** Builds the "issue scan code" use case (the customer's rotating QR). */
export const makeIssueScanToken = (): IssueScanToken => new IssueScanToken(tokenSigner(), customerDirectory());

/** Builds the "preview scan" use case (staff look before they confirm). */
export const makePreviewScan = (): PreviewScan =>
  new PreviewScan(tokenSigner(), customerDirectory(), cardRepository(), programRepository());

/** Builds the "record stamp" use case. */
export const makeRecordStamp = (): RecordStamp =>
  new RecordStamp(tokenSigner(), customerDirectory(), cardRepository(), programRepository(), activityLog());

/** Builds the "redeem reward" use case. */
export const makeRedeemReward = (): RedeemReward =>
  new RedeemReward(tokenSigner(), customerDirectory(), cardRepository(), programRepository(), activityLog());

/** Builds the "get stamp program" use case. */
export const makeGetStampProgram = (): GetStampProgram => new GetStampProgram(programRepository());

/** Builds the "save stamp program" use case (owner action). */
export const makeSaveStampProgram = (): SaveStampProgram => new SaveStampProgram(programRepository());

/** Builds the "stamp my card with the table QR" use case (customer action; needs no signing secret). */
export const makeClaimTableStamp = (): ClaimTableStamp =>
  new ClaimTableStamp(tableCodeRepository(), customerDirectory(), cardRepository(), programRepository(), activityLog());

/** Builds the "stamp for a verified receipt" use case, called by the receipts module. */
export const makeGrantReceiptStamp = (): GrantReceiptStamp =>
  new GrantReceiptStamp(cardRepository(), programRepository(), activityLog());

/** Builds the "get table code" use case (owner, to print the table QR). */
export const makeGetTableCode = (): GetTableCode => new GetTableCode(tableCodeRepository());

/** Builds the "replace table code" use case (owner, after a QR photo leaks). */
export const makeRotateTableCode = (): RotateTableCode => new RotateTableCode(tableCodeRepository());

/** Builds the "card progress" use case (owner's customer list). */
export const makeListCardProgress = (): ListCardProgress => new ListCardProgress(cardRepository(), programRepository());

/** Builds the "stamp activity" report (owner: by employee, by source, table QR heavy users). */
export const makeGetStampActivity = (): GetStampActivity => new GetStampActivity(stampActivity());
