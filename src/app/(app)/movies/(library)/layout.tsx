import { MovieSubnav } from "@/components/movies/movie-subnav";
export default function MoviesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <MovieSubnav />
      {children}
    </div>
  );
}
