// Lazy-initialized Supabase Storage singleton + upload/sign accessors.
//
// Replaces Cloudinary for the Dossiers domain specifically (confidential
// candidate documents — diplomas, ID references, dossier PDFs). Cloudinary's
// `secure_url` is public and non-expiring by design (see cloudinary-client.ts's
// own documented invariant) — unacceptable for these files. Supabase Storage
// buckets are private by default; nothing here ever produces a permanent
// public link. Instead:
//   - `uploadBuffer()` stores the file and returns its bucket-relative PATH
//     (not a URL) — that's what gets persisted on the Dossier row.
//   - `signedUrl()` mints a short-lived signed URL from a stored path, called
//     only at the moment an already-authorized reader (an authenticated admin,
//     or a candidate who already proved reference+whatsapp) is served the
//     dossier. No permanent link ever exists to leak.
//
// Same lazy-init reasoning as cloudinary-client.ts: configuring at
// module-load time would read `process.env` before tests can stub it, and
// would make a missing-credentials failure an opaque crash instead of a
// clean 503 STORAGE_NOT_CONFIGURED the route can translate.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing or empty)');
    this.name = 'StorageNotConfiguredError';
  }
}

export interface UploadResult {
  /** Bucket-relative object path — NOT a URL, the bucket is private. */
  path: string;
  bytes: number;
}

let _client: SupabaseClient | null = null;
let _bucket: string | null = null;
let _bucketReady: Promise<void> | null = null;

function getClient(): { client: SupabaseClient; bucket: string } {
  if (!_client) {
    const url = process.env.SUPABASE_URL ?? '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!url || !serviceRoleKey) {
      throw new StorageNotConfiguredError();
    }
    _client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    _bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'dossiers-private';
  }
  return { client: _client, bucket: _bucket! };
}

// Creates the private bucket on first use if it doesn't exist yet — so a
// fresh Supabase project needs only the two env vars, no manual dashboard
// step. Memoized so concurrent requests don't race `createBucket` against
// each other; the "already exists" case is swallowed regardless, since two
// cold-started instances can still both lose that race once.
function ensureBucket(client: SupabaseClient, bucket: string): Promise<void> {
  if (!_bucketReady) {
    _bucketReady = (async () => {
      const { data } = await client.storage.getBucket(bucket);
      if (data) return;
      const { error } = await client.storage.createBucket(bucket, { public: false });
      if (error && !/already exists/i.test(error.message)) throw error;
    })();
  }
  return _bucketReady;
}

/**
 * Upload a buffer to the private Supabase Storage bucket. Returns the
 * bucket-relative path (caller persists this — never a URL). `path` is
 * fully caller-controlled (e.g. `dossiers/EB-092026-001/piece-jointe`),
 * matching the naming conventions the Dossiers routes already use.
 */
export async function uploadBuffer(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const { client, bucket } = getClient();
  await ensureBucket(client, bucket);

  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  return { path, bytes: body.length };
}

/**
 * Fresh short-lived signed URL for a stored path — generated on demand at
 * read time so no permanent public link ever exists. `null` in (no file
 * yet), `null` out. Also resolves to `null` (rather than throwing) when
 * storage isn't configured or the signing call fails, so a dossier missing
 * storage credentials still renders — just without working file links.
 */
export async function signedUrl(
  path: string | null | undefined,
  expiresInSeconds = 600,
): Promise<string | null> {
  if (!path) return null;
  try {
    const { client, bucket } = getClient();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Test-only escape hatch — clears the cached client/bucket so a test can
 * mutate `process.env.SUPABASE_*` and re-trigger lazy init. Never call this
 * from application code.
 *
 * @internal
 */
export function __resetSupabaseStorageSingleton(): void {
  _client = null;
  _bucket = null;
  _bucketReady = null;
}
