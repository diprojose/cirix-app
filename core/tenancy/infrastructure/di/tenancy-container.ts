import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { FirestoreBusinessRepository } from "../persistence/firestore-business-repository";
import { FirestoreMembershipRepository } from "../persistence/firestore-membership-repository";
import { CreateBusiness } from "../../application/use-cases/create-business";
import { GetBusinessBySlug } from "../../application/use-cases/get-business-by-slug";
import { ListBusinessesByIds } from "../../application/use-cases/list-businesses-by-ids";
import { AddMember } from "../../application/use-cases/add-member";
import { ResolveBusinessAccess } from "../../application/use-cases/resolve-business-access";
import { ListMyBusinesses } from "../../application/use-cases/list-my-businesses";

/*
 * Composition root for the tenancy module: the single place that knows the
 * concrete adapters (Firestore). They are created lazily so importing the
 * container needs no Firebase credentials at build time. Server-only.
 */

let businessRepository: BusinessRepository | null = null;
let membershipRepository: MembershipRepository | null = null;

function businesses(): BusinessRepository {
  businessRepository ??= new FirestoreBusinessRepository(adminFirestore());
  return businessRepository;
}

function memberships(): MembershipRepository {
  membershipRepository ??= new FirestoreMembershipRepository(adminFirestore());
  return membershipRepository;
}

/** Builds the "create business" use case (administrator action). */
export const makeCreateBusiness = (): CreateBusiness => new CreateBusiness(businesses(), memberships());

/** Builds the "get business by slug" use case (public QR landing). */
export const makeGetBusinessBySlug = (): GetBusinessBySlug => new GetBusinessBySlug(businesses());

/** Builds the "list businesses by ids" use case (a customer's cards). */
export const makeListBusinessesByIds = (): ListBusinessesByIds => new ListBusinessesByIds(businesses());

/** Builds the "add member" use case (grant or change a role). */
export const makeAddMember = (): AddMember => new AddMember(businesses(), memberships());

/** Builds the authorization gate for business data. */
export const makeResolveBusinessAccess = (): ResolveBusinessAccess =>
  new ResolveBusinessAccess(businesses(), memberships());

/** Builds the "list my businesses" use case (where I hold a role). */
export const makeListMyBusinesses = (): ListMyBusinesses => new ListMyBusinesses(businesses(), memberships());
