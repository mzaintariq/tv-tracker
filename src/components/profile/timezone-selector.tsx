"use client";

import { useMemo, useState, useTransition } from "react";
import {
  updateTimeZonePreference,
  type TimeZoneActionResult,
} from "@/app/actions/profile";

function availableTimeZones(current: string): string[] {
  const supportedValuesOf = (
    Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
  ).supportedValuesOf;
  const values = supportedValuesOf
    ? supportedValuesOf.call(Intl, "timeZone")
    : [current, "UTC"];
  return [...new Set([current, "UTC", ...values])].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function TimeZoneSelector({
  currentTimeZone,
}: {
  currentTimeZone: string;
}) {
  const [selected, setSelected] = useState(currentTimeZone);
  const [result, setResult] = useState<TimeZoneActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const timeZones = useMemo(
    () => availableTimeZones(currentTimeZone),
    [currentTimeZone],
  );

  function save(timeZone: string) {
    setResult(null);
    startTransition(async () => {
      const response = await updateTimeZonePreference(timeZone);
      setResult(response);
      if (!response.error) setSelected(timeZone);
    });
  }

  function useBrowserTimeZone() {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimeZone) {
      setResult({ error: "Your browser did not report a timezone." });
      return;
    }
    setSelected(browserTimeZone);
    save(browserTimeZone);
  }

  return (
    <section className="min-w-0">
      <h2 className="break-words text-lg font-semibold sm:text-xl">Timezone</h2>
      <p className="mt-1 break-words text-xs text-[var(--muted)] sm:text-base">
        Used to decide which releases appear under Today and Tomorrow.
      </p>
      <div className="mt-3 flex w-full min-w-0 max-w-lg flex-col gap-2 sm:mt-4 sm:gap-3">
        <label htmlFor="profile-timezone" className="text-xs font-medium sm:text-sm">
          Timezone
        </label>
        <select
          id="profile-timezone"
          value={selected}
          disabled={pending}
          onChange={(event) => setSelected(event.target.value)}
          className="interactive-control touch-target w-full min-w-0 rounded-lg border bg-[var(--surface)] px-3 text-[var(--foreground)]"
        >
          {timeZones.map((timeZone) => (
            <option key={timeZone} value={timeZone}>
              {timeZone}
            </option>
          ))}
        </select>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={pending}
            onClick={useBrowserTimeZone}
            className="touch-target rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-foreground)] sm:px-4 sm:text-sm"
          >
            {pending ? "Saving…" : "Use browser timezone"}
          </button>
          <button
            type="button"
            disabled={pending || selected === currentTimeZone}
            onClick={() => save(selected)}
            className="interactive-control touch-target rounded-lg border bg-[var(--surface)] px-3 text-xs font-semibold sm:px-4 sm:text-sm"
          >
            Save timezone
          </button>
        </div>
        {result?.error ? (
          <p role="alert" className="text-xs text-[var(--danger)] sm:text-sm">
            {result.error}
          </p>
        ) : null}
        {result?.success ? (
          <p role="status" className="text-xs text-[var(--success)] sm:text-sm">
            {result.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}
