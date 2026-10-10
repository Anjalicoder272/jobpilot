import { ButtonLink } from "@/components/ui/Button";
import Logo from "@/components/shell/Logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo className="mb-10" />
        <p className="font-mono text-sm text-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted">The link may be broken, or the page may have moved.</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/experiences" variant="secondary">Interview questions</ButtonLink>
        </div>
      </div>
    </main>
  );
}
