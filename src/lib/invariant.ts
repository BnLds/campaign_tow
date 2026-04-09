/**
 * Narrows `T | null | undefined` to `T` by throwing if absent.
 *
 * Use this to express invariants — situations where the absence of a value
 * is a programming error, not a domain case. The thrown error is grepable
 * (`git grep invariant`) and documents the assumption at the call site.
 *
 * Forbidden alternative: the non-null assertion operator (`!`). It lies to
 * the future reader and provides no runtime check.
 *
 * Domain cases (absence is legitimate) should use `?? null` and a return
 * type of `T | null` instead.
 */
export function invariant<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(`[invariant] ${message}`)
  }
  return value
}
