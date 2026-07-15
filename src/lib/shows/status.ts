export function isShowEnded(tmdbStatus: string | null): boolean {
  return tmdbStatus?.toLowerCase() === "ended";
}
