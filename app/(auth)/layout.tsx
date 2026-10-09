import { BrandMark, BrandPanel } from "@/components/auth/brand-panel";
import { ThemeToggle } from "@/components/theme-toggle";

/** Signed-out screens: the brand panel beside the form on wide screens, the form alone on small ones. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 p-4 sm:p-6">
          {/* The panel already carries the brand on wide screens. */}
          <BrandMark className="lg:invisible" />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="p-4 text-center text-xs text-muted-foreground sm:p-6">
          Uparima Support Portal · Authorised staff only
        </footer>
      </div>
    </div>
  );
}
