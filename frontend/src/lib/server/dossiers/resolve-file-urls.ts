import 'server-only';
import { signedUrl } from '@/lib/server/upload/supabase-storage-client';

// Ten minutes: long enough for a human to open a file link right after the
// page loads, short enough that a leaked link goes stale quickly. Every
// route response mints a fresh one — no permanent link is ever stored.
const SIGNED_URL_TTL_SECONDS = 600;

interface HasFileFields {
  pieceJointeUrl: string | null;
  diplomaBacUrl: string | null;
  diplomaDoctoratUrl: string | null;
  diplomaBacTranslatedUrl: string | null;
  diplomaDoctoratTranslatedUrl: string | null;
  ficheUrl: string | null;
  recepisseUrl: string | null;
}

/**
 * Swaps the Dossier storage paths for fresh short-lived signed URLs before
 * a response goes out. The DB columns keep their historical `*Url` names
 * but hold bucket-relative paths (private Supabase Storage) — this is the
 * one place that turns a path into something the browser can actually
 * fetch, and it's called at every point a Dossier reaches an HTTP response.
 */
export async function withSignedFileUrls<T extends HasFileFields>(dossier: T): Promise<T> {
  const [
    pieceJointeUrl,
    diplomaBacUrl,
    diplomaDoctoratUrl,
    diplomaBacTranslatedUrl,
    diplomaDoctoratTranslatedUrl,
    ficheUrl,
    recepisseUrl,
  ] = await Promise.all([
    signedUrl(dossier.pieceJointeUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.diplomaBacUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.diplomaDoctoratUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.diplomaBacTranslatedUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.diplomaDoctoratTranslatedUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.ficheUrl, SIGNED_URL_TTL_SECONDS),
    signedUrl(dossier.recepisseUrl, SIGNED_URL_TTL_SECONDS),
  ]);
  return {
    ...dossier,
    pieceJointeUrl,
    diplomaBacUrl,
    diplomaDoctoratUrl,
    diplomaBacTranslatedUrl,
    diplomaDoctoratTranslatedUrl,
    ficheUrl,
    recepisseUrl,
  };
}
