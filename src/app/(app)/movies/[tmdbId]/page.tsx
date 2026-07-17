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
  return <article className="mx-auto w-full max-w-5xl space-y-8"><header className="grid gap-6 sm:grid-cols-[180px_1fr]"><div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface-elevated)]"><MediaPoster source={movie.media.poster_path} title={movie.media.title} alt={`${movie.media.title} poster`} sizes="180px" tmdbSize="w500" fallbackClassName="text-3xl font-semibold text-[var(--muted)]" /></div><div className="space-y-4"><div><h1 className="text-3xl font-semibold">{movie.media.title}</h1><p className="text-[var(--muted)]">{date}{movie.media.runtime_minutes ? ` · ${movie.media.runtime_minutes} min` : ""}</p></div><p>{movie.media.overview || "No overview is available."}</p><p className="font-medium">{movie.membership.watched_at ? "Watched" : "Watch Next"}{movie.membership.is_favourite ? " · Favourite" : ""}</p><MovieControls tmdbId={tmdbId} mediaId={movie.media.id} membership={movie.membership} /></div></header></article>;
}
