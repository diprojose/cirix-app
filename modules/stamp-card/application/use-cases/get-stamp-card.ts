import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import { NotACustomerError } from "../../domain/errors/stamp-card-errors";
import { toStampCardDto, type StampCardDto } from "../dtos/stamp-card-dto";

export type GetStampCardInput = { businessId: string; userId: string };

/**
 * A customer's own card in one business: the data behind the card screen. The
 * business and user come from the server (slug and session), and the person
 * must have joined the business.
 */
export class GetStampCard implements UseCase<GetStampCardInput, StampCardDto> {
  constructor(
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly customers: CustomerDirectory,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: GetStampCardInput): Promise<Result<StampCardDto, DomainError>> {
    if ((await this.customers.find(input.businessId, input.userId)) === null) {
      return err(new NotACustomerError());
    }
    const [program, card] = await Promise.all([
      this.programs.get(input.businessId),
      this.cards.find(input.businessId, input.userId),
    ]);
    return ok(toStampCardDto(card, program, input.businessId, input.userId, this.now()));
  }
}
