"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function MoviesError({ reset }: { error: Error; reset: () => void }) { return <RouteErrorState title="Movies could not be loaded" description="Your movie library is temporarily unavailable. Please try again." reset={reset} backHref="/shows" backLabel="Back to TV Shows" />; }
