import type { ExploreMediaItem } from "@/lib/media/types";

import { MediaCard } from "@/components/explore/media-card";

type MediaGridProps = {
  items: ExploreMediaItem[];
};

export function MediaGrid({ items }: MediaGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <li key={`${item.mediaType}-${item.tmdbId}`} className="min-w-0">
          <MediaCard item={item} />
        </li>
      ))}
    </ul>
  );
}
