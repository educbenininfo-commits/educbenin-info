// Notification.type values for dossier-related events (dossier created,
// auth-diplome form submitted). Shared between server code (routes that
// create these rows / filter by them) and client code (the "Dossiers" nav
// badge, which counts unread notifications of these types) — a plain
// module with no 'server-only' import so it can cross the client/server
// boundary safely, same pattern as lib/theme.ts.
export const DOSSIER_CREATED = 'DOSSIER_CREATED';
export const DOSSIER_AUTH_SUBMITTED = 'DOSSIER_AUTH_SUBMITTED';

export const DOSSIER_NOTIFICATION_TYPES = [DOSSIER_CREATED, DOSSIER_AUTH_SUBMITTED] as const;
