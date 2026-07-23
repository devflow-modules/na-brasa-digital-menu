/**
 * Bump persisted session version to invalidate outstanding JWTs for this user.
 */
export function withSessionVersionBump<T extends object>(
  data: T,
): T & { sessionVersion: { increment: 1 } } {
  return {
    ...data,
    sessionVersion: { increment: 1 },
  };
}
