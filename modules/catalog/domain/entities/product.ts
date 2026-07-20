import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { ProductId } from "../value-objects/product-id";
import { Money } from "../value-objects/money";
import { Department } from "../value-objects/department";
import { InvalidPriceError, InvalidProductError } from "../errors/catalog-errors";

/** Props backing a {@link Product} aggregate. */
type ProductProps = {
  name: string;
  description: string;
  price: Money;
  costCents: number;
  department: Department;
  imageUrl: string;
  featured: boolean;
  available: boolean;
};

/** Input accepted by {@link Product.create}. */
export type CreateProductInput = {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  costCents?: number;
  currency?: string;
  department: string;
  imageUrl?: string;
  featured?: boolean;
  available?: boolean;
};

/**
 * Product is the catalog aggregate root: an item the shop offers, made to order
 * (there is no stock). It spans every department — desserts and grocery/food
 * items alike — and owns its invariants (a non-empty name, a valid {@link Money}
 * price and a known {@link Department}), so an invalid Product can never be
 * constructed.
 */
export class Product extends AggregateRoot<ProductProps, ProductId> {
  private constructor(id: ProductId, props: ProductProps) {
    super(id, props);
  }

  /** Builds a Product, validating its invariants. Fails with a Result on invalid input. */
  static create(input: CreateProductInput): Result<Product, DomainError> {
    const name = input.name.trim();
    if (name.length === 0) {
      return err(new InvalidProductError("Product name must not be empty."));
    }

    const priceResult = Money.create(input.priceCents, input.currency);
    if (!priceResult.ok) {
      return priceResult;
    }

    // Cost is the unit cost of goods, in the same currency as the price. It is
    // optional (defaults to 0 for legacy products) and only feeds the rewards
    // margin calculation — it is never shown to shoppers.
    const costCents = input.costCents ?? 0;
    if (!Number.isInteger(costCents) || costCents < 0) {
      return err(new InvalidPriceError("Product cost must be a non-negative integer number of cents."));
    }

    const departmentResult = Department.create(input.department);
    if (!departmentResult.ok) {
      return departmentResult;
    }

    const id = input.id ? ProductId.from(input.id) : ProductId.generate();
    const product = new Product(id, {
      name,
      description: input.description.trim(),
      price: priceResult.value,
      costCents,
      department: departmentResult.value,
      imageUrl: input.imageUrl?.trim() ?? "",
      featured: input.featured ?? false,
      available: input.available ?? true,
    });
    return ok(product);
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

  /** Unit cost of goods in minor units (same currency as the price); 0 when
   * unknown. Internal only — it feeds the rewards margin, never the storefront. */
  get costCents(): number {
    return this.props.costCents;
  }

  /** Unit margin in minor units: price minus cost, floored at 0. */
  get marginCents(): number {
    return Math.max(0, this.props.price.amountCents - this.props.costCents);
  }

  get department(): Department {
    return this.props.department;
  }

  /** URL of the product photo, or an empty string when none is set (UI shows a placeholder). */
  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get isFeatured(): boolean {
    return this.props.featured;
  }

  get isAvailable(): boolean {
    return this.props.available;
  }
}
