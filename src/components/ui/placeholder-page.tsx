type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
        {description}
      </p>
    </section>
  );
}
