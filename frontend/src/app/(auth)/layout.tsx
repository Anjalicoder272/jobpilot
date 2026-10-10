import Logo from "@/components/shell/Logo";
import ThemeToggle from "@/components/shell/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-60" />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="relative flex-1 px-4 pb-16 pt-6 sm:pt-14">
        {children}
      </main>
    </div>
  );
}
