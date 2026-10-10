// Pure display helpers for the site's contact details — safe on server and
// client. The values themselves come from lib/server/site-settings.ts.
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface ContactSettings {
  email: string;
  /** E.164, e.g. "+22967249837". */
  whatsapp: string;
}

export const DEFAULT_CONTACT: ContactSettings = {
  email: 'educbenininfo@gmail.com',
  whatsapp: '+22967249837',
};

export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, '');
  return text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;
}

/**
 * "+2290167249837" → "+229 01 67 24 98 37". Numbers libphonenumber doesn't
 * consider valid (e.g. pre-2021 8-digit Bénin numbers) would otherwise come
 * out ungrouped ("+229 67249837"), so those get pairs of digits instead.
 */
export function formatWhatsapp(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  if (parsed.isValid()) return parsed.formatInternational();
  const pairs = parsed.nationalNumber.match(/.{1,2}/g)?.join(' ') ?? parsed.nationalNumber;
  return `+${parsed.countryCallingCode} ${pairs}`;
}
