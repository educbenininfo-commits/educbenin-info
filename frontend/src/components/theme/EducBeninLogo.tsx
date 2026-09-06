// Theme-aware wordmark — the "light" lockup has dark text (for a light
// background) and the "dark" lockup has white text (for a dark background).
// Renders both and lets CSS (.logo-light-only/.logo-dark-only in
// globals.css) show the right one for the current theme — a plain <img src>
// can't react to [data-theme]/prefers-color-scheme on its own, and this
// avoids making every page that uses the public logo a client component
// just to pick a src.
export function EducBeninLogo({ height = 32 }: { height?: number }) {
  const style = { height, width: 'auto' as const };
  return (
    <>
      <img
        src="/logo/lockup-light.svg"
        alt="Educ Bénin"
        height={height}
        style={style}
        className="logo-light-only"
      />
      <img
        src="/logo/lockup-dark.svg"
        alt="Educ Bénin"
        height={height}
        style={style}
        className="logo-dark-only"
      />
    </>
  );
}
