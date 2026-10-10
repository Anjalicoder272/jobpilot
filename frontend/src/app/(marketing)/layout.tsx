import Footer from "@/components/shell/Footer";
import MarketingHeader from "@/components/shell/MarketingHeader";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
