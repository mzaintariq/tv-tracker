import type { ExploreMediaItem } from "@/lib/media/types";

import { MediaCard } from "@/components/explore/media-card";

type MediaGridProps = {
  items: ExploreMediaItem[];
};

export function MediaGrid({ items }: MediaGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <li key={`${item.mediaType}-${item.tmdbId}`}>
          <MediaCard item={item} />
        </li>
      ))}
    </ul>
  );
}
