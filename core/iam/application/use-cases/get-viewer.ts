import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { guestViewer, toViewerDto, type ViewerDto } from "../dtos/viewer-dto";

/** Input for {@link GetViewer}: the raw session cookie, or `null` when absent. */
export type GetViewerInput = {
  sessionCookie: string | null;
};

/**
 * Resolves the current viewer from a session cookie into a plain {@link ViewerDto}.
 * This is the "authenticate the request" use case: it never fails for business
 * reasons — a missing, invalid or expired cookie simply resolves to the guest
 * viewer, which is a legitimate access mode. Depends only on the
 * {@link IdentityProvider} port, received by constructor injection.
 */
export class GetViewer implements UseCase<GetViewerInput, ViewerDto> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(input: GetViewerInput): Promise<Result<ViewerDto, DomainError>> {
    if (!input.sessionCookie) {
      return ok(guestViewer);
    }

    const account = await this.identity.verifySession(input.sessionCookie);
    return ok(toViewerDto(account));
  }
}
