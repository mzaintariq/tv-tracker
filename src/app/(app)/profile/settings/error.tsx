"use client";

import { RouteErrorState } from "@/components/ui/route-error-state";

export default function ProfileSettingsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Settings could not be loaded"
      description="Your account settings are temporarily unavailable. Please try again."
      reset={reset}
      backHref="/profile"
      backLabel="Back to Profile"
    />
  );
}
