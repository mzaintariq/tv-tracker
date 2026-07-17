import Link from "next/link";
import { redirect } from "next/navigation";
import { MovieSection } from "@/components/movies/movie-sections";
import { loadMovies } from "@/lib/movies/data";
import { createClient } from "@/lib/supabase/server";

export default async function MoviesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const list = await loadMovies(user.id);
  return <div className="mx-auto w-full max-w-6xl space-y-10"><header><h1 className="text-3xl font-semibold tracking-tight">Movies</h1><p className="mt-2 text-[var(--muted)]">Your movie watch list and watched history.</p></header>{!list.movies.length ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><h2 className="text-xl font-semibold">No movies yet</h2><p className="mt-2 text-[var(--muted)]">Find a movie in Explore and add it to your watch list.</p><Link href="/explore?type=movie" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">Explore movies</Link></div> : <><MovieSection title="Watch Next" description="Movies in your library that you have not watched." movies={list.watchNext} /><MovieSection title="Recently Watched" description="Your ten most recently watched movies." movies={list.recentlyWatched} /><MovieSection title="Watched" movies={list.watched} /><MovieSection title="Favourites" description="Favourites can be watched or still on your watch list." movies={list.favourites} /></>}</div>;
}
