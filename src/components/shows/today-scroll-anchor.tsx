"use client";

import { useEffect } from "react";

export function TodayScrollAnchor() {
  useEffect(() => {
    const state = window.history.state as Record<string, unknown> | null;
    if (state?.tracktvTodayPositioned || window.scrollY > 0) return;
    const today = document.getElementById("today");
    if (!today) return;
    window.history.replaceState({ ...state, tracktvTodayPositioned: true }, "");
    requestAnimationFrame(() => today.scrollIntoView({ block: "start", behavior: "auto" }));
  }, []);
  return null;
}
