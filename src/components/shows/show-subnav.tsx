import Link from "next/link";

export function ShowSubnav({ current }: { current: "watch-list" | "upcoming" }) {
  const items = [
    { href: "/shows", label: "Watch List", value: "watch-list" },
    { href: "/shows/upcoming", label: "Upcoming", value: "upcoming" },
  ] as const;
  return <nav aria-label="TV Shows" className="flex gap-2 border-b border-[var(--border)]">
    {items.map((item) => <Link key={item.href} href={item.href} aria-current={current === item.value ? "page" : undefined} className={`border-b-2 px-3 py-2 text-sm font-semibold ${current === item.value ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{item.label}</Link>)}
  </nav>;
}
