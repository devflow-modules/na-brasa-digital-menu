/** True only on the unauthenticated admin login route. */
export function isAdminLoginPath(pathname: string | null): boolean {
  return pathname === "/admin/login";
}

/**
 * Polling starts only after leaving /admin/login.
 * The shared admin layout does not remount on client-side login redirect.
 */
export function shouldStartAdminNotificationPolling(
  pathname: string | null,
): boolean {
  return !isAdminLoginPath(pathname);
}
