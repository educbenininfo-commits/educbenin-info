import 'server-only';
import { uploadBuffer } from './supabase-storage-client';
import { verifyMagicBytes } from './sniff';

/**
 * Cap applied to the two candidate-supplied "combine everything into one
 * PDF" uploads (Accompagnement's pièce jointe, and the authentification
 * form's single documents upload) — 5 MB each, so the two together stay
 * within the ~10 MB per-candidate storage budget the product targets on
 * Supabase's free tier. Other uploads (fiche, récépissé — small
 * institution-issued documents) keep the global `UPLOAD_MAX_BYTES` default.
 */
export const CANDIDATE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export type PublicUploadError =
  | { code: 'FILE_TOO_LARGE'; status: 413 }
  | { code: 'INVALID_MIME'; status: 415 }
  | { code: 'MAGIC_BYTE_MISMATCH'; status: 415 }
  | { code: 'STORAGE_NOT_CONFIGURED'; status: 503 }
  | { code: 'UPLOAD_FAILED'; status: 502 };

export type PublicUploadResult =
  | { ok: true; path: string; bytes: number }
  | { ok: false; error: PublicUploadError };

/**
 * Validates + uploads a candidate-supplied file with NO auth check — for
 * the anonymous public dossier routes only (POST /api/dossiers, the fiche
 * upload, and the auth-form document upload) plus the admin récépissé
 * upload (auth already handled by the caller route). Reuses the same
 * magic-byte sniffing + size/MIME gates everywhere. Does NOT write a
 * `FileUpload` row — that table's `userId` column is tied to authenticated
 * users; the returned storage path is stored directly on the Dossier row
 * by the caller.
 *
 * `storagePath` is the full bucket-relative path the caller wants (e.g.
 * `EB-202609-001/piece-jointe`) — this function does not invent naming,
 * callers control it so filenames stay predictable per DESIGN-SPEC.md's
 * "dossier-{nom}.pdf" / "diplôme-{nom}-{prénom}.pdf" conventions.
 *
 * `opts.maxBytes` overrides the global `UPLOAD_MAX_BYTES` default for
 * callers with a tighter per-file budget (see `CANDIDATE_DOCUMENT_MAX_BYTES`).
 */
export async function uploadPublicFile(
  file: File,
  storagePath: string,
  opts?: { maxBytes?: number },
): Promise<PublicUploadResult> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: { code: 'STORAGE_NOT_CONFIGURED', status: 503 } };
  }

  const allowedMime = (process.env.UPLOAD_ALLOWED_MIME ?? 'image/jpeg,image/png,image/webp')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const maxBytes =
    opts?.maxBytes ?? Number.parseInt(process.env.UPLOAD_MAX_BYTES ?? '10485760', 10);

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
    const uploaded = await uploadBuffer(storagePath, buf, file.type);
    return { ok: true, path: uploaded.path, bytes: uploaded.bytes };
  } catch {
    return { ok: false, error: { code: 'UPLOAD_FAILED', status: 502 } };
  }
}
