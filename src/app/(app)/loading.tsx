export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4">
      <div className="h-9 w-48 rounded-md bg-[var(--surface-elevated)]" />
      <div className="h-5 w-full max-w-md rounded-md bg-[var(--surface-elevated)]" />
      <div className="h-5 w-2/3 max-w-sm rounded-md bg-[var(--surface-elevated)]" />
    </div>
  );
}
