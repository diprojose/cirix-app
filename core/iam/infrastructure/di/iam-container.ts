import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { FirebaseIdentityProvider } from "../firebase/firebase-identity-provider";
import { GetViewer } from "../../application/use-cases/get-viewer";
import { CreateSession } from "../../application/use-cases/create-session";
import { RevokeSession } from "../../application/use-cases/revoke-session";
import { ResolveUserByEmail } from "../../application/use-cases/resolve-user-by-email";

/*
 * Composition root for the iam module. This is the single place that knows the
 * concrete identity adapter: it instantiates the Firebase provider and injects
 * it into use cases through their constructors. Swapping the identity provider
 * means changing only this file.
 */

// One provider instance per server runtime.
const identityProvider: IdentityProvider = new FirebaseIdentityProvider();
// Only the review entry point uses identity without platform admission.
const reviewIdentityProvider: IdentityProvider = new FirebaseIdentityProvider("reviews");
export const makeGetReviewViewer = (): GetViewer => new GetViewer(reviewIdentityProvider);
export const makeCreateReviewSession = (): CreateSession => new CreateSession(reviewIdentityProvider);

// Customers and business staff: any verified account, authorized per business.
const memberIdentityProvider: IdentityProvider = new FirebaseIdentityProvider("member");
export const makeGetMemberViewer = (): GetViewer => new GetViewer(memberIdentityProvider);
export const makeCreateMemberSession = (): CreateSession => new CreateSession(memberIdentityProvider);

/** Builds the "resolve current viewer" use case with its dependencies wired. */
export const makeGetViewer = (): GetViewer => new GetViewer(identityProvider);

/** Builds the "create session from id token" use case. */
export const makeCreateSession = (): CreateSession =>
  new CreateSession(identityProvider);

/** Builds the "revoke session on logout" use case. */
export const makeRevokeSession = (): RevokeSession =>
  new RevokeSession(identityProvider);

/** Builds the "resolve user by email" use case (operator action). */
export const makeResolveUserByEmail = (): ResolveUserByEmail =>
  new ResolveUserByEmail(identityProvider);
