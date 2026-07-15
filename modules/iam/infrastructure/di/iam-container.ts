import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { FirebaseIdentityProvider } from "../firebase/firebase-identity-provider";
import { GetViewer } from "../../application/use-cases/get-viewer";
import { CreateSession } from "../../application/use-cases/create-session";
import { RevokeSession } from "../../application/use-cases/revoke-session";
import { GrantPremium } from "../../application/use-cases/grant-premium";
import { RevokePremium } from "../../application/use-cases/revoke-premium";

/*
 * Composition root for the iam module. This is the single place that knows the
 * concrete identity adapter: it instantiates the Firebase provider and injects
 * it into use cases through their constructors. Swapping the identity provider
 * means changing only this file.
 */

// One provider instance per server runtime.
const identityProvider: IdentityProvider = new FirebaseIdentityProvider();

/** Builds the "resolve current viewer" use case with its dependencies wired. */
export const makeGetViewer = (): GetViewer => new GetViewer(identityProvider);

/** Builds the "create session from id token" use case. */
export const makeCreateSession = (): CreateSession =>
  new CreateSession(identityProvider);

/** Builds the "revoke session on logout" use case. */
export const makeRevokeSession = (): RevokeSession =>
  new RevokeSession(identityProvider);

/** Builds the "grant premium claim" use case (operator action). */
export const makeGrantPremium = (): GrantPremium =>
  new GrantPremium(identityProvider);

/** Builds the "revoke premium claim" use case (operator action). */
export const makeRevokePremium = (): RevokePremium =>
  new RevokePremium(identityProvider);
