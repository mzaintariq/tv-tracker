"use client";

import { useState, useTransition } from "react";

import {
  updateRegionPreference,
  type RegionActionResult,
} from "@/app/actions/profile";
import { REGION_OPTIONS } from "@/lib/regions";

export function RegionSelector({ currentRegion }: { currentRegion: string | null }) {
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
      <h2 className="break-words text-xl font-semibold">Regional information</h2>
      <div className="mt-4 flex w-full min-w-0 max-w-lg flex-col gap-3">
        <label htmlFor="profile-region" className="text-sm font-medium">
          Release and streaming region
        </label>
        <p id="profile-region-help" className="break-words text-sm text-[var(--muted)]">
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
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selected || selected === saved}
          onClick={save}
          className="touch-target w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto sm:self-start"
        >
          {pending ? "Saving…" : "Save region"}
        </button>
        {result?.error ? (
          <p id="profile-region-error" role="alert" className="text-sm text-[var(--danger)]">
            {result.error}
          </p>
        ) : null}
        {result?.success ? (
          <p role="status" className="text-sm text-[var(--success)]">{result.success}</p>
        ) : null}
      </div>
    </section>
  );
}
