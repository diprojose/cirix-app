/**
 * Base class for expected, business-level failures. Instances are carried
 * inside a `Result` rather than thrown across layers. The stable `code` lets
 * outer adapters map a failure to a transport concern (HTTP status, UI copy)
 * without matching on the human-readable message.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable identifier for this kind of failure. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
