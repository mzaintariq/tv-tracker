import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgetTvTimeButton } from "@/components/import/import-controls";
import { ImportUploadForm } from "@/components/import/import-upload-form";
import { requireImportList } from "@/lib/import/tv-time/route-results";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const result = await supabase.from("imports").select("id,status,created_at,total_items,applied_items,skipped_items").eq("user_id", user.id).order("created_at", { ascending: false });
  const imports = requireImportList(result);
  return (
    <div className="min-w-0 space-y-8">
      <header className="min-w-0">
        <h1 className="break-words text-3xl font-semibold">TV Time import</h1>
        <p className="break-words text-[var(--muted)]">Analyze your GDPR ZIP without storing the raw archive. Timezone-less timestamps are interpreted as UTC.</p>
      </header>
      <section className="min-w-0 rounded-xl border p-4 sm:p-5">
        <h2 className="mb-3 break-words text-xl font-semibold">Analyze an export</h2>
        <ImportUploadForm mode="analyze" />
      </section>
      <section className="min-w-0 space-y-3">
        <h2 className="break-words text-xl font-semibold">Import sessions</h2>
        {imports.map((item) => (
          <Link className="block min-w-0 rounded-xl border p-4" key={item.id} href={`/profile/import/${item.id}`}>
            <span className="block break-words font-medium">{new Date(item.created_at).toLocaleString()}</span>
            <span className="mt-1 block break-words text-[var(--muted)]">{item.status} · {item.applied_items}/{item.total_items} applied · {item.skipped_items} skipped</span>
          </Link>
        ))}
        {!imports.length ? <p className="text-[var(--muted)]">No imports analyzed yet.</p> : null}
      </section>
      <section className="min-w-0 rounded-xl border p-4 sm:p-5">
        <h2 className="break-words text-xl font-semibold">Privacy cleanup</h2>
        <p className="my-2 break-words text-sm text-[var(--muted)]">Forgetting import data keeps shows, movies, favourites, and watch history already imported into TrackTV.</p>
        <ForgetTvTimeButton />
      </section>
    </div>
  );
}
