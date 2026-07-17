"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function ProfileError({ reset }: { error: Error; reset: () => void }) { return <RouteErrorState title="Profile could not be loaded" description="Your profile and statistics are temporarily unavailable. Please try again." reset={reset} backHref="/shows" backLabel="Back to TV Shows" />; }
