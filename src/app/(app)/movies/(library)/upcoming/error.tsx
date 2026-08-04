"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function MovieUpcomingError({ reset }: { error: Error; reset: () => void }) { return <RouteErrorState title="Upcoming movies could not be loaded" description="Regional movie release dates are temporarily unavailable. Please try again." reset={reset} backHref="/movies" backLabel="Back to Watch List" />; }
