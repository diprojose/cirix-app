import type { Business } from "../../domain/entities/business";
import type { Membership } from "../../domain/entities/membership";
import type { BusinessId } from "../../domain/value-objects/business-id";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { BusinessSlugTakenError } from "../../domain/errors/tenancy-errors";

/** Process-local adapter for tests and local experiments. */
export class InMemoryBusinessRepository implements BusinessRepository {
  private readonly items = new Map<string, Business>();

  async findById(id: BusinessId): Promise<Business | null> {
    return this.items.get(id.value) ?? null;
  }

  async idForSlug(slug: string): Promise<string | null> {
    return (await this.findBySlug(slug))?.id.value ?? null;
  }

  async findBySlug(slug: string): Promise<Business | null> {
    return [...this.items.values()].find((business) => business.slug.value === slug) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<Business[]> {
    return ids.flatMap((id) => {
      const business = this.items.get(id);
      return business ? [business] : [];
    });
  }

  async create(business: Business): Promise<void> {
    if (await this.findBySlug(business.slug.value)) throw new BusinessSlugTakenError(business.slug.value);
    this.items.set(business.id.value, business);
  }
}

/** Process-local adapter for tests and local experiments. */
export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly items = new Map<string, Membership>();

  private key = (businessId: string, userId: string) => `${businessId}_${userId}`;

  async find(businessId: string, userId: string): Promise<Membership | null> {
    return this.items.get(this.key(businessId, userId)) ?? null;
  }

  async listByUser(userId: string): Promise<Membership[]> {
    return [...this.items.values()].filter((membership) => membership.userId === userId);
  }

  async listByBusiness(businessId: string): Promise<Membership[]> {
    return [...this.items.values()].filter((membership) => membership.businessId === businessId);
  }

  async save(membership: Membership): Promise<void> {
    this.items.set(this.key(membership.businessId, membership.userId), membership);
  }

  async remove(businessId: string, userId: string): Promise<void> {
    this.items.delete(this.key(businessId, userId));
  }
}
