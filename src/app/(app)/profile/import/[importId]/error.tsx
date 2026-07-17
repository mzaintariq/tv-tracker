"use client";
import { RouteErrorState } from "@/components/ui/route-error-state";
export default function ImportDetailError({ reset }: { error: Error; reset: () => void }) { return <RouteErrorState title="Import data could not be loaded" description="Your import information is temporarily unavailable. Please try again." reset={reset} backHref="/profile/import" backLabel="Back to Imports" />; }
