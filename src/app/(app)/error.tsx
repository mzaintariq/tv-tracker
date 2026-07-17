"use client";

import { RouteErrorState } from "@/components/ui/route-error-state";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState title="Something went wrong" description="TrackTV is temporarily unavailable. Please try again." reset={reset} backHref="/shows" backLabel="Back to TV Shows" />;
}
