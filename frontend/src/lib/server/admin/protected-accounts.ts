// Hard-coded protection for the founder/owner account — distinct from the
// "last SUPERADMIN" guard (which only kicks in when exactly one SUPERADMIN
// remains): this specific account can never be demoted, suspended, or
// removed by ANYONE, even another SUPERADMIN, regardless of how many other
// SUPERADMINs exist. It always keeps full access.
import 'server-only';

const PROTECTED_SUPERADMIN_EMAILS = ['lissanonpren@gmail.com'];

export function isProtectedSuperadmin(email: string): boolean {
  return PROTECTED_SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}
