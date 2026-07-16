import type { CandidateDisplay } from "./matching-quality";

export type ImportIssueForDisplay = { id: string; importItemId: string | null; issue_type: string; is_blocking: boolean; status: string; sourceTitle?: string; mediaType?: "tv" | "movie"; seasonNumber?: number; episodeNumber?: number; detailedCount?: number; cachedCount?: number; selectedTmdbId?: number | null; selectedCandidate?: CandidateDisplay };
export type CompletedIssueGroup = { key: string; label: string; issues: ImportIssueForDisplay[]; expandable: boolean };

export function issueTypeLabel(type: string): string {
  if (type === "ambiguous_media") return "Several possible matches";
  if (type === "unmatched_media") return "No match found";
  if (type === "missing_episode_coordinate") return "Unmatched episode record";
  if (type === "movie_favourites_confirmation") return "Movie favourites decision";
  return type.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}
export function issueStatusLabel(status: string): string { return status === "resolved" ? "Matched" : status === "skipped" ? "Skipped from import" : status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : status[0]?.toUpperCase() + status.slice(1); }

function completedKey(issue: ImportIssueForDisplay): { key: string; label: string; expandable: boolean } {
  const mediaLabel = issue.mediaType === "tv" ? "TV shows" : "movies";
  if (["ambiguous_media", "unmatched_media"].includes(issue.issue_type) && issue.mediaType) return { key: `media:${issue.status}:${issue.mediaType}`, label: `${issue.status === "resolved" ? "Resolved" : "Skipped"} ${mediaLabel}`, expandable: true };
  if (issue.issue_type === "missing_episode_coordinate") return issue.status === "resolved" ? { key: "coordinates:resolved", label: "Previously unavailable episode records", expandable: true } : { key: "coordinates:skipped", label: "Episode records not imported", expandable: true };
  return { key: `decision:${issue.issue_type}:${issue.status}`, label: `${issueTypeLabel(issue.issue_type)} — ${issueStatusLabel(issue.status)}`, expandable: false };
}

export function buildImportIssueDisplayModel(issues: ImportIssueForDisplay[]) {
  const open = issues.filter((issue) => issue.status === "open");
  const notices = open.filter((issue) => !issue.is_blocking);
  const needsAttention = open.filter((issue) => issue.is_blocking && !["ambiguous_media", "unmatched_media"].includes(issue.issue_type));
  const groups = new Map<string, CompletedIssueGroup>();
  for (const issue of issues.filter((item) => item.status !== "open")) { const descriptor = completedKey(issue); const group = groups.get(descriptor.key) ?? { ...descriptor, issues: [] }; group.issues.push(issue); groups.set(descriptor.key, group); }
  for (const group of groups.values()) group.issues.sort((a, b) => (a.sourceTitle ?? "").localeCompare(b.sourceTitle ?? "", undefined, { sensitivity: "base" }) || (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) || (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
  return { total: issues.length, openBlocking: open.filter((issue) => issue.is_blocking).length, openNonBlocking: notices.length, resolved: issues.filter((issue) => issue.status !== "open" && issue.status !== "skipped").length, skipped: issues.filter((issue) => issue.status === "skipped").length, needsAttention, notices, completedGroups: [...groups.values()].sort((a, b) => a.label.localeCompare(b.label)) };
}
