"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";

export default function UpcomingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Could not load Upcoming"
      description="Cached episode data is temporarily unavailable. Please try again."
      reset={reset}
      backHref="/shows"
      backLabel="Back to Watch List"
    />
  );
}
