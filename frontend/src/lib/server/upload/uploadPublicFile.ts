import 'server-only';
import { uploadBuffer } from './cloudinary-client';
import { verifyMagicBytes } from './sniff';

export type PublicUploadError =
  | { code: 'FILE_TOO_LARGE'; status: 413 }
  | { code: 'INVALID_MIME'; status: 415 }
  | { code: 'MAGIC_BYTE_MISMATCH'; status: 415 }
  | { code: 'STORAGE_NOT_CONFIGURED'; status: 503 }
  | { code: 'UPLOAD_FAILED'; status: 502 };

export type PublicUploadResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; error: PublicUploadError };

/**
 * Validates + uploads a candidate-supplied file with NO auth check — for
 * the anonymous public dossier routes only (POST /api/dossiers, the
 * fiche upload, and the auth-form diploma uploads). Reuses the same
 * magic-byte sniffing + size/MIME gates as the authenticated /api/upload
 * route (frontend/src/app/api/upload/route.ts) so both paths enforce
 * identical rules. Does NOT write a `FileUpload` row — that table's
 * `userId` column is tied to authenticated users; the returned
 * Cloudinary URL is stored directly on the Dossier row by the caller.
 *
 * `publicId` is the full Cloudinary public_id the caller wants (e.g.
 * `EB-202609-001/piece-jointe`) — this function does not invent naming,
 * callers control it so filenames stay predictable per DESIGN-SPEC.md's
 * "dossier-{nom}.pdf" / "diplôme-{nom}-{prénom}-bac.pdf" conventions.
 */
export async function uploadPublicFile(file: File, publicId: string): Promise<PublicUploadResult> {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return { ok: false, error: { code: 'STORAGE_NOT_CONFIGURED', status: 503 } };
  }

  const allowedMime = (process.env.UPLOAD_ALLOWED_MIME ?? 'image/jpeg,image/png,image/webp')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const maxBytes = Number.parseInt(process.env.UPLOAD_MAX_BYTES ?? '10485760', 10);

  if (file.size > maxBytes) {
    return { ok: false, error: { code: 'FILE_TOO_LARGE', status: 413 } };
  }
  if (!allowedMime.includes(file.type)) {
    return { ok: false, error: { code: 'INVALID_MIME', status: 415 } };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { match, sniffed } = verifyMagicBytes(buf, file.type);
  if (sniffed && !match) {
    return { ok: false, error: { code: 'MAGIC_BYTE_MISMATCH', status: 415 } };
  }

  try {
    const uploaded = await uploadBuffer(publicId, buf, file.type);
    return { ok: true, url: uploaded.secureUrl, bytes: uploaded.bytes };
  } catch {
    return { ok: false, error: { code: 'UPLOAD_FAILED', status: 502 } };
  }
}
