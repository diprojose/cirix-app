import type { DomainError } from "./domain-error";

/** Successful outcome carrying a value. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** Failed outcome carrying an error. */
export type Err<E> = { readonly ok: false; readonly error: E };

/**
 * Result models an operation that can either succeed with a value or fail with
 * an error, without throwing. It is a discriminated union of plain objects, so
 * it serializes safely across the React Server Components server→client
 * boundary and enables exhaustive narrowing on the `ok` discriminant.
 */
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

/** Builds a successful Result. */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** Builds a failed Result. */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Type guard narrowing a Result to its successful branch. */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/** Type guard narrowing a Result to its failed branch. */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;
