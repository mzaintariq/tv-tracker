"use client";

import { useState, useTransition } from "react";

import {
  updateRegionPreference,
  type RegionActionResult,
} from "@/app/actions/profile";
import { REGION_OPTIONS } from "@/lib/regions";

export function RegionSelector({
  currentRegion,
}: {
  currentRegion: string | null;
}) {
  const [selected, setSelected] = useState(currentRegion ?? "");
  const [saved, setSaved] = useState(currentRegion ?? "");
  const [result, setResult] = useState<RegionActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const describedBy = result?.error
    ? "profile-region-help profile-region-error"
    : "profile-region-help";

  function save() {
    setResult(null);
    startTransition(async () => {
      const response = await updateRegionPreference(selected);
      setResult(response);
      if (!response.error) setSaved(selected);
    });
  }

  return (
    <section className="min-w-0">
      <h2 className="break-words text-lg font-semibold sm:text-xl">
        Regional information
      </h2>
      <div className="mt-3 flex w-full min-w-0 max-w-lg flex-col gap-2 sm:mt-4 sm:gap-3">
        <label htmlFor="profile-region" className="text-xs font-medium sm:text-sm">
          Release and streaming region
        </label>
        <p
          id="profile-region-help"
          className="break-words text-xs text-[var(--muted)] sm:text-sm"
        >
          Controls theatrical, digital, streaming-provider, and certification
          information. It does not change your timezone or watched-date display.
        </p>
        <select
          id="profile-region"
          value={selected}
          disabled={pending}
          aria-describedby={describedBy}
          aria-invalid={result?.error ? true : undefined}
          onChange={(event) => {
            setSelected(event.target.value);
            setResult(null);
          }}
          className="interactive-control touch-target w-full min-w-0 rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)]"
        >
          <option value="">Choose a region</option>
          {REGION_OPTIONS.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selected || selected === saved}
          onClick={save}
          className="touch-target w-full rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-foreground)] sm:w-auto sm:self-start sm:px-4 sm:text-sm"
        >
          {pending ? "Saving…" : "Save region"}
        </button>
        {result?.error ? (
          <p
            id="profile-region-error"
            role="alert"
            className="text-xs text-[var(--danger)] sm:text-sm"
          >
            {result.error}
          </p>
        ) : null}
        {result?.success ? (
          <p
            role="status"
            className="text-xs text-[var(--success)] sm:text-sm"
          >
            {result.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}
