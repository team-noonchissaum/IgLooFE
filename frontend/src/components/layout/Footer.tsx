export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-[var(--surface)] border-t border-border mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <p className="text-xs text-text-muted text-center">
          © {currentYear} IgLoo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
