import type { Result } from "../domain/result";
import type { DomainError } from "../domain/domain-error";

/**
 * UseCase is the contract for a single application-level operation the outside
 * world can invoke (from a page, route handler or server action). Concrete use
 * cases receive their collaborators through constructor injection and return a
 * `Result` instead of throwing for expected, business-level failures.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, DomainError>>;
}
