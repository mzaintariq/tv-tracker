import type { ShowTrackingStatus, ThemePreference } from "@/types/database";

export const TRACKTV_EXPORT_SCHEMA = "tracktv.user-export" as const;
export const TRACKTV_EXPORT_VERSION = 1 as const;

export type TrackTvExportProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  theme: ThemePreference;
};

export type TrackTvExportShowTracking =
  | { inLibrary: true; status: ShowTrackingStatus; isFavourite: boolean; addedAt: string }
  | { inLibrary: false };

export type TrackTvExportWatchedEpisode = {
  providerIds: { tmdb: number | null };
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string | null;
  watchedAt: string;
};

export type TrackTvExportShow = {
  providerIds: { tmdb: number };
  title: string;
  firstAirDate: string | null;
  tracking: TrackTvExportShowTracking;
  watchedEpisodes: TrackTvExportWatchedEpisode[];
};

export type TrackTvExportMovie = {
  providerIds: { tmdb: number };
  title: string;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  addedAt: string;
  state: "watch_next" | "watched";
  watchedAt: string | null;
  isFavourite: boolean;
};

export type TrackTvExport = {
  schema: typeof TRACKTV_EXPORT_SCHEMA;
  version: typeof TRACKTV_EXPORT_VERSION;
  generatedAt: string;
  profile: TrackTvExportProfile;
  tvShows: TrackTvExportShow[];
  movies: TrackTvExportMovie[];
};
