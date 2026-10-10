"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Floating button that appears after scrolling down. */
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="press pop-in bg-gradient-brand fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full text-white shadow-pop"
    >
      <ArrowUp size={20} />
    </button>
  );
}
