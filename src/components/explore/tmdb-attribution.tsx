export function TmdbAttribution() {
  return (
    <p className="text-xs leading-relaxed text-[var(--muted)]">
      This product uses the{" "}
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-[var(--foreground)]"
      >
        TMDB API
      </a>{" "}
      but is not endorsed or certified by TMDB.
    </p>
  );
}
