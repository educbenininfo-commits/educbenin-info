// Shown above every candidate-facing PDF upload — states the max size up
// front (previously only discovered after a failed submit) and links to a
// third-party compression tool so a too-large file can actually be fixed
// on the spot instead of the candidate being stuck.
export function UploadHint({ maxMb }: { maxMb: number }) {
  return (
    <p className="hint" style={{ marginBottom: 8 }}>
      Format PDF uniquement, {maxMb}&nbsp;Mo maximum.{' '}
      <a
        href="https://www.ilovepdf.com/fr/compresser_pdf"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--prod-primary)', textDecoration: 'underline', fontWeight: 500 }}
      >
        Compresser un PDF trop volumineux →
      </a>
    </p>
  );
}
