export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ThemePreference = "light" | "dark" | "system";

export type MediaType = "tv" | "movie";

export type ShowTrackingStatus = "active" | "paused" | "dropped";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          theme: ThemePreference;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          theme?: ThemePreference;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          theme?: ThemePreference;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_items: {
        Row: {
          id: string;
          tmdb_id: number;
          media_type: MediaType;
          title: string;
          original_title: string | null;
          overview: string | null;
          poster_path: string | null;
          backdrop_path: string | null;
          release_date: string | null;
          imdb_id: string | null;
          runtime_minutes: number | null;
          average_episode_runtime_minutes: number | null;
          tmdb_status: string | null;
          last_synced_at: string;
          episodes_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tmdb_id: number;
          media_type: MediaType;
          title: string;
          original_title?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          imdb_id?: string | null;
          runtime_minutes?: number | null;
          average_episode_runtime_minutes?: number | null;
          tmdb_status?: string | null;
          last_synced_at?: string;
          episodes_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tmdb_id?: number;
          media_type?: MediaType;
          title?: string;
          original_title?: string | null;
          overview?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string | null;
          imdb_id?: string | null;
          runtime_minutes?: number | null;
          average_episode_runtime_minutes?: number | null;
          tmdb_status?: string | null;
          last_synced_at?: string;
          episodes_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_shows: {
        Row: {
          id: string;
          user_id: string;
          media_item_id: string;
          status: ShowTrackingStatus;
          is_favourite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          media_item_id: string;
          status?: ShowTrackingStatus;
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          media_item_id?: string;
          status?: ShowTrackingStatus;
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_shows_media_item_id_fkey";
            columns: ["media_item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_movies: {
        Row: {
          id: string;
          user_id: string;
          media_item_id: string;
          watched_at: string | null;
          is_favourite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          media_item_id: string;
          watched_at?: string | null;
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          media_item_id?: string;
          watched_at?: string | null;
          is_favourite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_movies_media_item_id_fkey";
            columns: ["media_item_id"];
            isOneToOne: false;
            referencedRelation: "media_items";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          id: string; media_item_id: string; season_number: number;
          episode_number: number; title: string; air_date: string | null;
          runtime_minutes: number | null; tmdb_episode_id: number;
          last_synced_at: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; media_item_id: string; season_number: number;
          episode_number: number; title: string; air_date?: string | null;
          runtime_minutes?: number | null; tmdb_episode_id: number;
          last_synced_at?: string; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; media_item_id?: string; season_number?: number;
          episode_number?: number; title?: string; air_date?: string | null;
          runtime_minutes?: number | null; tmdb_episode_id?: number;
          last_synced_at?: string; created_at?: string; updated_at?: string;
        };
        Relationships: [{
          foreignKeyName: "episodes_media_item_id_fkey"; columns: ["media_item_id"];
          isOneToOne: false; referencedRelation: "media_items"; referencedColumns: ["id"];
        }];
      };
      watched_episodes: {
        Row: { id: string; user_id: string; episode_id: string; watched_at: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; episode_id: string; watched_at?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; episode_id?: string; watched_at?: string; created_at?: string; updated_at?: string };
        Relationships: [{
          foreignKeyName: "watched_episodes_episode_id_fkey"; columns: ["episode_id"];
          isOneToOne: false; referencedRelation: "episodes"; referencedColumns: ["id"];
        }];
      };
      imports: {
        Row: { id: string; user_id: string; source_type: string; source_fingerprint: string; status: string; timestamp_policy: string; summary: Json; assumptions: Json; total_items: number; matched_items: number; applied_items: number; skipped_items: number; failed_items: number; analyzed_at: string | null; matching_completed_at: string | null; apply_started_at: string | null; completed_at: string | null; last_error_code: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; source_type: string; source_fingerprint: string; status: string; timestamp_policy: string; summary?: Json; assumptions?: Json; total_items?: number; matched_items?: number; applied_items?: number; skipped_items?: number; failed_items?: number; analyzed_at?: string | null; matching_completed_at?: string | null; apply_started_at?: string | null; completed_at?: string | null; last_error_code?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["imports"]["Insert"]>;
        Relationships: [];
      };
      source_media_mappings: {
        Row: { id: string; user_id: string; source_provider: string; source_key_version: number; media_type: MediaType; source_key: string; source_title: string; source_release_date: string | null; tmdb_id: number | null; resolution_status: string; confidence: string | null; candidate_tmdb_ids: number[]; candidate_metadata: Json; resolution_reason: string | null; resolved_at: string | null; first_import_id: string | null; last_import_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; source_provider: string; source_key_version: number; media_type: MediaType; source_key: string; source_title: string; source_release_date?: string | null; tmdb_id?: number | null; resolution_status: string; confidence?: string | null; candidate_tmdb_ids?: number[]; candidate_metadata?: Json; resolution_reason?: string | null; resolved_at?: string | null; first_import_id?: string | null; last_import_id?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["source_media_mappings"]["Insert"]>;
        Relationships: [];
      };
      import_items: {
        Row: { id: string; user_id: string; import_id: string; mapping_id: string | null; media_type: MediaType; source_key: string; import_mode: string; match_status: string; application_status: string; match_context: Json | null; source_record_count: number; normalized_event_count: number; collapsed_event_count: number; source_item_digest: string; matching_attempt_count: number; application_attempt_count: number; match_claim_token: string | null; match_claimed_at: string | null; match_claim_expires_at: string | null; last_error_code: string | null; last_matched_at: string | null; last_attempted_at: string | null; applied_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; import_id: string; mapping_id?: string | null; media_type: MediaType; source_key: string; import_mode: string; match_status?: string; application_status?: string; match_context: Json | null; source_record_count?: number; normalized_event_count?: number; collapsed_event_count?: number; source_item_digest: string; matching_attempt_count?: number; application_attempt_count?: number; match_claim_token?: string | null; match_claimed_at?: string | null; match_claim_expires_at?: string | null; last_error_code?: string | null; last_matched_at?: string | null; last_attempted_at?: string | null; applied_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["import_items"]["Insert"]>;
        Relationships: [];
      };
      import_issues: {
        Row: { id: string; user_id: string; import_id: string; import_item_id: string | null; issue_key: string; issue_type: string; is_blocking: boolean; status: string; details: Json; resolution: Json | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; import_id: string; import_item_id?: string | null; issue_key: string; issue_type: string; is_blocking: boolean; status?: string; details?: Json; resolution?: Json | null; resolved_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["import_issues"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mark_episode_watched: { Args: { p_media_item_id: string; p_episode_id: string; p_watched_at?: string }; Returns: undefined };
      mark_episode_unwatched: { Args: { p_media_item_id: string; p_episode_id: string }; Returns: undefined };
      update_episode_watched_at: { Args: { p_media_item_id: string; p_episode_id: string; p_watched_at: string }; Returns: undefined };
      set_season_watched: { Args: { p_media_item_id: string; p_season_number: number; p_watched: boolean; p_watched_at?: string }; Returns: undefined };
      mark_episodes_before: { Args: { p_media_item_id: string; p_season_number: number; p_episode_number: number; p_watched_at?: string }; Returns: undefined };
      initialize_user_show: { Args: { p_media_item_id: string; p_mode: string; p_season_number?: number | null; p_episode_number?: number | null; p_season_numbers?: number[] | null; p_watched_at?: string }; Returns: undefined };
      initialize_tv_time_import: { Args: { p_user_id: string; p_source_fingerprint: string; p_summary: Json; p_assumptions: Json; p_items: Json; p_issues: Json }; Returns: string };
      claim_import_items_for_matching: { Args: { p_user_id: string; p_import_id: string; p_limit: number; p_lease_seconds?: number }; Returns: { item_id: string; claim_token: string }[] };
      skip_all_unresolved_tv_time_media: { Args: { p_user_id: string; p_import_id: string }; Returns: number };
      reconcile_show_episodes: { Args: { p_media_item_id: string; p_episodes: Json }; Returns: undefined };
      load_watch_list_episode_data: { Args: Record<never, never>; Returns: Json };
      load_movie_library_data: { Args: Record<never, never>; Returns: Json };
      load_profile_statistics: {
        Args: Record<never, never>;
        Returns: {
          tracked_shows: number;
          episodes_watched: number;
          movies_in_library: number;
          movies_watched: number;
          favourite_shows: number;
          favourite_movies: number;
          completed_shows: number;
          caught_up_shows: number;
          tv_minutes: number;
          movie_minutes: number;
        }[];
      };
      load_profile_favourites: {
        Args: Record<never, never>;
        Returns: {
          membership_id: string;
          media_item_id: string;
          tmdb_id: number;
          media_type: string;
          title: string;
          poster_path: string | null;
        }[];
      };
      load_upcoming_data: { Args: { p_today: string }; Returns: Json };
      load_upcoming_refresh_candidates: { Args: { p_tmdb_ids: number[] }; Returns: Json };
      skip_unresolved_tv_time_media_by_type: { Args: { p_user_id: string; p_import_id: string; p_media_type: string }; Returns: number };
      skip_missing_tv_time_coordinates: { Args: { p_user_id: string; p_import_id: string; p_import_item_id: string | null }; Returns: number };
      get_tv_time_import_apply_progress: { Args: { p_import_id: string }; Returns: Json };
      complete_import_match_claim: { Args: { p_user_id: string; p_item_id: string; p_claim_token: string; p_status: string; p_tmdb_id: number | null; p_candidates: number[]; p_confidence: string | null; p_reason: string | null }; Returns: undefined };
      confirm_tv_time_import_mapping: { Args: { p_user_id: string; p_import_id: string; p_item_id: string; p_tmdb_id: number }; Returns: undefined };
      skip_tv_time_import_item: { Args: { p_user_id: string; p_import_id: string; p_item_id: string }; Returns: undefined };
      resolve_tv_time_import_issue: { Args: { p_user_id: string; p_import_id: string; p_issue_id: string; p_status: string }; Returns: undefined };
      set_tv_time_import_paused: { Args: { p_user_id: string; p_import_id: string; p_paused: boolean }; Returns: undefined };
      start_tv_time_import_apply: { Args: { p_user_id: string; p_import_id: string }; Returns: undefined };
      recalculate_tv_time_import_status: { Args: { p_user_id: string; p_import_id: string }; Returns: string };
      delete_tv_time_import: { Args: { p_user_id: string; p_import_id: string }; Returns: undefined };
      apply_tv_time_show_import: { Args: { p_user_id: string; p_import_id: string; p_import_item_id: string; p_tmdb_id: number; p_is_favourite: boolean; p_episode_events: Json }; Returns: Json };
      apply_tv_time_movie_import_batch: { Args: { p_user_id: string; p_import_id: string; p_items: Json }; Returns: Json };
      forget_tv_time_import_data: { Args: { p_user_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type MediaItem = Database["public"]["Tables"]["media_items"]["Row"];
export type UserShow = Database["public"]["Tables"]["user_shows"]["Row"];
export type UserMovie = Database["public"]["Tables"]["user_movies"]["Row"];
export type Episode = Database["public"]["Tables"]["episodes"]["Row"];
export type WatchedEpisode = Database["public"]["Tables"]["watched_episodes"]["Row"];
