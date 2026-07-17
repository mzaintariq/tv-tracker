"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function MovieDetailError({ reset }: { error: Error; reset: () => void }) { return <RouteErrorState title="This movie could not be loaded" description="Movie information is temporarily unavailable. Please try again." reset={reset} backHref="/movies" backLabel="Back to Movies" />; }
