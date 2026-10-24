/** Where a super admin lands after signing in: a path inside the admin area only, never an outside address. */
export const ADMIN_HOME = '/admin';

export function safeAdminNext(next: string | null | undefined): string {
  return next && /^\/admin(\/[A-Za-z0-9/_-]*)?$/.test(next) ? next : ADMIN_HOME;
}
