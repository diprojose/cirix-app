import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { DessertId } from "../value-objects/dessert-id";
import { Money } from "../value-objects/money";
import { InvalidDessertError } from "../errors/catalog-errors";

/** Props backing a {@link Dessert} aggregate. */
type DessertProps = {
  name: string;
  description: string;
  price: Money;
  available: boolean;
};

/** Input accepted by {@link Dessert.create}. */
export type CreateDessertInput = {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  currency?: string;
  available?: boolean;
};

/**
 * Dessert is the catalog aggregate root: a made-to-order product the shop
 * offers. It owns its invariants — a non-empty name and a valid {@link Money}
 * price — so an invalid Dessert can never be constructed.
 */
export class Dessert extends AggregateRoot<DessertProps, DessertId> {
  private constructor(id: DessertId, props: DessertProps) {
    super(id, props);
  }

  /** Builds a Dessert, validating its invariants. Fails with a Result on invalid input. */
  static create(input: CreateDessertInput): Result<Dessert, DomainError> {
    const name = input.name.trim();
    if (name.length === 0) {
      return err(new InvalidDessertError("Dessert name must not be empty."));
    }

    const priceResult = Money.create(input.priceCents, input.currency);
    if (!priceResult.ok) {
      return priceResult;
    }

    const id = input.id ? DessertId.from(input.id) : DessertId.generate();
    const dessert = new Dessert(id, {
      name,
      description: input.description.trim(),
      price: priceResult.value,
      available: input.available ?? true,
    });
    return ok(dessert);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get isAvailable(): boolean {
    return this.props.available;
  }
}
