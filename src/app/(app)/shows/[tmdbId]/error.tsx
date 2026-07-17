"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function ShowDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <RouteErrorState title="This show could not be loaded" description="Show information is temporarily unavailable. Please try again." reset={reset} backHref="/shows" backLabel="Back to TV Shows" />; }
