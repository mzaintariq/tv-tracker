type AuthenticatedAppShellProps = {
  children?: React.ReactNode;
  desktopNavigation: React.ReactNode;
  mobileNavigation: React.ReactNode;
  themeSync: React.ReactNode;
};

export function AuthenticatedAppShell({
  children,
  desktopNavigation,
  mobileNavigation,
  themeSync,
}: AuthenticatedAppShellProps) {
  return (
    <div className="flex min-h-full flex-1">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {themeSync}
      {desktopNavigation}
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main-content flex-1 pt-6 md:pt-8"
        >
          {children}
        </main>
        {mobileNavigation}
      </div>
    </div>
  );
}
