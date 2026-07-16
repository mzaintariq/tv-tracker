import type { ValidInitialProgress } from "@/lib/shows/validation";
import type { SyncResult } from "@/lib/shows/sync";

type Synchronize = () => Promise<SyncResult>;
type InitializeMembership = (mediaItemId: string) => Promise<{ error: string | null }>;

export type InitializeProgressResult = { error?: string; failedSeasons?: number[] };

export async function initializeProgress(
  selection: ValidInitialProgress,
  existingMediaItemId: string | null,
  synchronize: Synchronize,
  initializeMembership: InitializeMembership,
): Promise<InitializeProgressResult> {
  let mediaItemId = existingMediaItemId;
  let failedSeasons: number[] = [];

  if (!mediaItemId || selection.mode !== "start") {
    const synced = await synchronize();
    mediaItemId = synced.mediaItemId;
    failedSeasons = synced.failedSeasons;
  }

  const failedRegular = failedSeasons.filter((season) => season > 0);
  if (selection.mode !== "start" && failedRegular.length) {
    return { error: `Could not synchronize regular season${failedRegular.length === 1 ? "" : "s"} ${failedRegular.join(", ")}. The show was not added.` };
  }

  const initialized = await initializeMembership(mediaItemId);
  if (initialized.error) return { error: initialized.error };
  return { failedSeasons };
}
