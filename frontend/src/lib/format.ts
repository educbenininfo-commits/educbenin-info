// Shared formatting helpers — plain functions, no 'use client' needed, safe
// to call from Server Components.

// Replace the narrow no-break space toLocaleString('fr-FR') inserts as a
// thousands separator with a normal breaking space, so text using it can
// wrap in narrow layouts — mirrors educbenin-prototype.html's fmtF2.
export function fmtF2(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\u202F/g, ' ') + ' FCFA';
}
