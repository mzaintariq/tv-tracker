export const ALLOWED_TV_TIME_FILES = {
  "tracking-prod-records.csv": ["user_id","created_at","type","series_id","updated_at","uuid","type-uuid-n","watch_count","watches","release_date_range_key","follow_date_range_key","runtime","entity_type","alpha_range_key","release_date","rewatch_count","watch_date","episode_id","episode_number","season_number","series_uuid","total_movies_runtime","total_series_runtime","unitarian","watch_date_range_key","country","watched_episode_range_key","bulk_type","movie_name","series_name"],
  "tracking-prod-records-v2.csv": ["runtime","s_id","user_id","created_at","s_no","ep_id","ep_no","key","gsi","updated_at","total_movies_runtime","total_series_runtime","ep_watch_count","movie_watch_count","series_follow_count","is_for_later","most_recent_ep_watched","is_followed","uuid","is_archived","followed_at","is_unitary","rewatch_count","is_special","bulk_type","movie_name","series_name","season_number","episode_number"],
  "user_tv_show_data.csv": ["nb_episodes_seen","tv_show_name","user_id","tv_show_id","is_followed","is_favorited"],
  "followed_tv_show.csv": ["diffusion","notification_type","created_at","updated_at","active","folder_id","archived","notification_offset","tv_show_name","user_id","tv_show_id"],
  "user_show_special_status.csv": ["user_id","tv_show_id","status","created_at","updated_at","tv_show_name"],
  "lists-prod-lists.csv": ["user_id","s_key","description","name","ordering","objects","created_at","is_public","type","lists","list_count","updated_at","movie_name","series_name","season_number","episode_number"],
  "stats-prod-cache.csv": ["stats","version","user_id","entity_type","timestamp","stat_type","type","interaction_type","quick_watches","biggest_marathons","watched_episodes_per_month","watched_episodes_per_week","movie_name","series_name","season_number","episode_number"],
} as const;

export type AllowedTvTimeFile = keyof typeof ALLOWED_TV_TIME_FILES;
