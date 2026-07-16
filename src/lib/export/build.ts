import {
  TRACKTV_EXPORT_SCHEMA,
  TRACKTV_EXPORT_VERSION,
  type TrackTvExport,
  type TrackTvExportMovie,
  type TrackTvExportShow,
  type TrackTvExportWatchedEpisode,
} from "@/lib/export/schema";
import type { ShowTrackingStatus, ThemePreference } from "@/types/database";

export type ExportProfileRow = { display_name: string | null; avatar_url: string | null; timezone: string; theme: ThemePreference };
export type ExportShowMembershipRow = { id: string; media_item_id: string; status: ShowTrackingStatus; is_favourite: boolean; created_at: string };
export type ExportMovieMembershipRow = { id: string; media_item_id: string; watched_at: string | null; is_favourite: boolean; created_at: string };
export type ExportWatchedRow = { id: string; episode_id: string; watched_at: string };
export type ExportEpisodeRow = { id: string; media_item_id: string; tmdb_episode_id: number | null; season_number: number; episode_number: number; title: string; air_date: string | null };
export type ExportMediaRow = { id: string; tmdb_id: number; media_type: "tv" | "movie"; title: string; release_date: string | null; runtime_minutes: number | null };

export type ExportSourceData = {
  profile: ExportProfileRow;
  showMemberships: ExportShowMembershipRow[];
  movieMemberships: ExportMovieMembershipRow[];
  watched: ExportWatchedRow[];
  episodes: ExportEpisodeRow[];
  media: ExportMediaRow[];
};

export class ExportDataIntegrityError extends Error {
  constructor() { super("Required export metadata is missing or invalid."); this.name = "ExportDataIntegrityError"; }
}

function requireTimestamp(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) throw new ExportDataIntegrityError();
  return value;
}

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

function compareEpisodes(left: TrackTvExportWatchedEpisode, right: TrackTvExportWatchedEpisode): number {
  const leftTmdb = left.providerIds.tmdb;
  const rightTmdb = right.providerIds.tmdb;
  const tmdbOrder = leftTmdb === null && rightTmdb === null ? 0 : leftTmdb === null ? 1 : rightTmdb === null ? -1 : leftTmdb - rightTmdb;
  return left.seasonNumber - right.seasonNumber
    || left.episodeNumber - right.episodeNumber
    || Date.parse(left.watchedAt) - Date.parse(right.watchedAt)
    || compareText(left.watchedAt, right.watchedAt)
    || tmdbOrder
    || compareText(left.title, right.title);
}

export function buildTrackTvExport(source: ExportSourceData, generatedAt: string): TrackTvExport {
  requireTimestamp(generatedAt);
  const mediaById = new Map(source.media.map((row) => [row.id, row]));
  const episodeById = new Map(source.episodes.map((row) => [row.id, row]));
  const watchedByMediaId = new Map<string, TrackTvExportWatchedEpisode[]>();

  for (const watched of source.watched) {
    const episode = episodeById.get(watched.episode_id);
    if (!episode) throw new ExportDataIntegrityError();
    const parent = mediaById.get(episode.media_item_id);
    if (!parent || parent.media_type !== "tv") throw new ExportDataIntegrityError();
    const exported: TrackTvExportWatchedEpisode = {
      providerIds: { tmdb: episode.tmdb_episode_id },
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      title: episode.title,
      airDate: episode.air_date,
      watchedAt: requireTimestamp(watched.watched_at),
    };
    const rows = watchedByMediaId.get(parent.id) ?? [];
    rows.push(exported);
    watchedByMediaId.set(parent.id, rows);
  }

  const currentMediaIds = new Set<string>();
  const tvShows: TrackTvExportShow[] = source.showMemberships.map((membership) => {
    const media = mediaById.get(membership.media_item_id);
    if (!media || media.media_type !== "tv") throw new ExportDataIntegrityError();
    currentMediaIds.add(media.id);
    return {
      providerIds: { tmdb: media.tmdb_id }, title: media.title, firstAirDate: media.release_date,
      tracking: { inLibrary: true, status: membership.status, isFavourite: membership.is_favourite, addedAt: requireTimestamp(membership.created_at) },
      watchedEpisodes: [...(watchedByMediaId.get(media.id) ?? [])].sort(compareEpisodes),
    };
  });

  for (const [mediaId, watchedEpisodes] of watchedByMediaId) {
    if (currentMediaIds.has(mediaId)) continue;
    const media = mediaById.get(mediaId);
    if (!media || media.media_type !== "tv") throw new ExportDataIntegrityError();
    tvShows.push({
      providerIds: { tmdb: media.tmdb_id }, title: media.title, firstAirDate: media.release_date,
      tracking: { inLibrary: false }, watchedEpisodes: [...watchedEpisodes].sort(compareEpisodes),
    });
  }

  const movies: TrackTvExportMovie[] = source.movieMemberships.map((membership) => {
    const media = mediaById.get(membership.media_item_id);
    if (!media || media.media_type !== "movie") throw new ExportDataIntegrityError();
    return {
      providerIds: { tmdb: media.tmdb_id }, title: media.title, releaseDate: media.release_date,
      runtimeMinutes: media.runtime_minutes, addedAt: requireTimestamp(membership.created_at),
      state: membership.watched_at === null ? "watch_next" : "watched",
      watchedAt: membership.watched_at === null ? null : requireTimestamp(membership.watched_at),
      isFavourite: membership.is_favourite,
    };
  });

  tvShows.sort((left, right) => left.providerIds.tmdb - right.providerIds.tmdb || compareText(left.title, right.title));
  movies.sort((left, right) => left.providerIds.tmdb - right.providerIds.tmdb || compareText(left.title, right.title));

  return {
    schema: TRACKTV_EXPORT_SCHEMA, version: TRACKTV_EXPORT_VERSION, generatedAt,
    profile: { displayName: source.profile.display_name, avatarUrl: source.profile.avatar_url, timezone: source.profile.timezone, theme: source.profile.theme },
    tvShows, movies,
  };
}
