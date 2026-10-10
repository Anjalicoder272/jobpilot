"use client";

import { useEffect } from "react";

/**
 * Adds class "kbd" to <html> while the user navigates with the keyboard (Tab key),
 * and removes it on any mouse or touch interaction. CSS shows focus outlines only in "kbd" mode.
 */
export default function KeyboardFocus() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (e: KeyboardEvent) => e.key === "Tab" && root.classList.add("kbd");
    const onPointer = () => root.classList.remove("kbd");
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);
  return null;
}
