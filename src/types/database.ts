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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type MediaItem = Database["public"]["Tables"]["media_items"]["Row"];
export type UserShow = Database["public"]["Tables"]["user_shows"]["Row"];
export type UserMovie = Database["public"]["Tables"]["user_movies"]["Row"];
