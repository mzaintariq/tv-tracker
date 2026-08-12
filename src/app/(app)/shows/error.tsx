"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";

export default function ShowsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Could not load TV shows"
      description="Your watch list is temporarily unavailable. Please try again."
      reset={reset}
      backHref="/movies"
      backLabel="Go to Movies"
    />
  );
}
