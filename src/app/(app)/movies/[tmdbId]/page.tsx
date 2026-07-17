import { notFound, redirect } from "next/navigation";
import { MediaPoster } from "@/components/media/media-poster";
import { MovieControls } from "@/components/movies/movie-controls";
import { loadMovieDetail } from "@/lib/movies/data";
import { parseTmdbId } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";

export default async function MovieDetailPage({ params }: { params: Promise<{ tmdbId: string }> }) {
  const tmdbId = parseTmdbId((await params).tmdbId);
  if (tmdbId === null) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const movie = await loadMovieDetail(user.id, tmdbId);
  if (!movie) notFound();
  const date = movie.media.release_date ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${movie.media.release_date}T00:00:00Z`)) : "Release date unknown";
  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl space-y-8">
      <header className="grid min-w-0 gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:mx-0">
          <MediaPoster source={movie.media.poster_path} title={movie.media.title} alt={`${movie.media.title} poster`} sizes="180px" tmdbSize="w500" fallbackClassName="text-3xl font-semibold text-[var(--muted)]" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-semibold">{movie.media.title}</h1>
            <p className="break-words text-[var(--muted)]">{date}{movie.media.runtime_minutes ? ` · ${movie.media.runtime_minutes} min` : ""}</p>
          </div>
          <p className="break-words">{movie.media.overview || "No overview is available."}</p>
          <p className="break-words font-medium">{movie.membership.watched_at ? "Watched" : "Watch Next"}{movie.membership.is_favourite ? " · Favourite" : ""}</p>
          <MovieControls tmdbId={tmdbId} mediaId={movie.media.id} membership={movie.membership} />
        </div>
      </header>
    </article>
  );
}
