import AppHeader, { MobileTabBar } from "@/components/shell/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main id="main" className="pb-24 md:pb-12">
        {children}
      </main>
      <MobileTabBar />
    </>
  );
}
