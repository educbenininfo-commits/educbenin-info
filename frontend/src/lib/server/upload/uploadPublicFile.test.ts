import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase-storage-client', () => ({
  uploadBuffer: vi.fn(),
}));

import { uploadBuffer } from './supabase-storage-client';
import { uploadPublicFile, CANDIDATE_DOCUMENT_MAX_BYTES } from './uploadPublicFile';

const mockUploadBuffer = vi.mocked(uploadBuffer);

const PDF_BYTES = Buffer.from('%PDF-1.4\n%test');

function pdfFile(bytes: Buffer = PDF_BYTES, name = 'test.pdf'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SUPABASE_URL', 'https://demo.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  vi.stubEnv('UPLOAD_ALLOWED_MIME', 'image/jpeg,image/png,image/webp,application/pdf');
  vi.stubEnv('UPLOAD_MAX_BYTES', '10485760');
});

describe('uploadPublicFile', () => {
  it('uploads a valid PDF and returns its storage path', async () => {
    mockUploadBuffer.mockResolvedValueOnce({
      path: 'dossiers/EB-202609-001/piece',
      bytes: PDF_BYTES.length,
    });

    const result = await uploadPublicFile(pdfFile(), 'dossiers/EB-202609-001/piece');

    expect(result).toEqual({
      ok: true,
      path: 'dossiers/EB-202609-001/piece',
      bytes: PDF_BYTES.length,
    });
    expect(mockUploadBuffer).toHaveBeenCalledWith(
      'dossiers/EB-202609-001/piece',
      expect.any(Buffer),
      'application/pdf',
    );
  });

  it('rejects a file larger than UPLOAD_MAX_BYTES without calling storage', async () => {
    vi.stubEnv('UPLOAD_MAX_BYTES', '4');
    const result = await uploadPublicFile(pdfFile(), 'x');
    expect(result).toEqual({ ok: false, error: { code: 'FILE_TOO_LARGE', status: 413 } });
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('rejects a file larger than an explicit maxBytes override', async () => {
    const result = await uploadPublicFile(pdfFile(), 'x', { maxBytes: 4 });
    expect(result).toEqual({ ok: false, error: { code: 'FILE_TOO_LARGE', status: 413 } });
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('exports the 5 MB candidate-document cap used by the piece-jointe and diploma uploads', () => {
    expect(CANDIDATE_DOCUMENT_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it('rejects a MIME type not in UPLOAD_ALLOWED_MIME', async () => {
    vi.stubEnv('UPLOAD_ALLOWED_MIME', 'image/jpeg,image/png,image/webp');
    const result = await uploadPublicFile(pdfFile(), 'x');
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_MIME', status: 415 } });
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('rejects bytes that do not match the declared MIME (magic-byte mismatch)', async () => {
    const fakePdf = new File([Buffer.from('not a real pdf')], 'x.pdf', {
      type: 'application/pdf',
    });
    const result = await uploadPublicFile(fakePdf, 'x');
    expect(result).toEqual({ ok: false, error: { code: 'MAGIC_BYTE_MISMATCH', status: 415 } });
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('returns STORAGE_NOT_CONFIGURED when Supabase env is absent, without reading the file', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    const result = await uploadPublicFile(pdfFile(), 'x');
    expect(result).toEqual({ ok: false, error: { code: 'STORAGE_NOT_CONFIGURED', status: 503 } });
    expect(mockUploadBuffer).not.toHaveBeenCalled();
  });

  it('returns UPLOAD_FAILED when uploadBuffer throws', async () => {
    mockUploadBuffer.mockRejectedValueOnce(new Error('network blip'));
    const result = await uploadPublicFile(pdfFile(), 'x');
    expect(result).toEqual({ ok: false, error: { code: 'UPLOAD_FAILED', status: 502 } });
  });
});
