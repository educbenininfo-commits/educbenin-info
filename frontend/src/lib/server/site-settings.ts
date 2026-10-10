import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import { DEFAULT_CONTACT, type ContactSettings } from '@/lib/contact-display';

export const SITE_SETTINGS_ID = 'site';

// cache(): several components on one page (footer + page body) read this —
// one query per request.
export const getContactSettings = cache(async (): Promise<ContactSettings> => {
  const row = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
  return {
    email: row?.contactEmail || DEFAULT_CONTACT.email,
    whatsapp: row?.contactWhatsapp || DEFAULT_CONTACT.whatsapp,
  };
});
