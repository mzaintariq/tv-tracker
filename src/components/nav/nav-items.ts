export const APP_NAV_ITEMS = [
  { href: "/shows", label: "TV Shows" },
  { href: "/movies", label: "Movies" },
  { href: "/explore", label: "Explore" },
  { href: "/profile", label: "Profile" },
] as const;

export type AppNavHref = (typeof APP_NAV_ITEMS)[number]["href"];
