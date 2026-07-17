"use client";

import Image from "next/image";
import { useState } from "react";
import { titleInitials } from "@/lib/media/types";

type MediaPosterProps = {
  source: string | null | undefined;
  title: string;
  alt: string;
  sizes: string;
  tmdbSize?: "w92" | "w185" | "w342" | "w500";
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
};

export function resolvePosterSource(source: string | null | undefined, tmdbSize: NonNullable<MediaPosterProps["tmdbSize"]> = "w342"): string | null {
  const value = source?.trim();
  if (!value) return null;
  if (value.startsWith("/")) return `https://image.tmdb.org/t/p/${tmdbSize}${value}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function posterFallback(title: string): string {
  const initials = titleInitials(title);
  return initials === "?" ? "No poster" : initials;
}

export function MediaPoster({ source, title, alt, sizes, tmdbSize = "w342", className = "object-cover", fallbackClassName = "text-2xl font-semibold text-[var(--muted)]", fallbackLabel }: MediaPosterProps) {
  const resolvedSource = resolvePosterSource(source, tmdbSize);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (resolvedSource && resolvedSource !== failedSource) {
    const usesConfiguredLoader = resolvedSource.startsWith("https://image.tmdb.org/t/p/");
    return <Image src={resolvedSource} alt={alt} fill sizes={sizes} className={className} unoptimized={!usesConfiguredLoader} onError={() => setFailedSource(resolvedSource)} />;
  }
  return <span className={`flex h-full w-full items-center justify-center ${fallbackClassName}`} aria-hidden={alt === "" ? "true" : undefined} role={alt === "" ? undefined : "img"} aria-label={alt || undefined}>{fallbackLabel ?? posterFallback(title)}</span>;
}
