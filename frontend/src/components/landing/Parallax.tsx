"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ParallaxProps = {
  children?: React.ReactNode;
  className?: string;
  /** Pixels of vertical travel across one viewport of scrolling. Negative moves against the scroll. */
  speed?: number;
  /** Scale from `scaleFrom` (entering the viewport) to 1 (centred). */
  scaleFrom?: number;
  /** Fade out as the element leaves through the top (hero content). */
  fadeOut?: boolean;
  "aria-hidden"?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Scroll-linked transform written straight to the DOM once per frame, never through React state.
 * Offscreen elements are skipped. Disabled for prefers-reduced-motion.
 */
export default function Parallax({ children, className, speed = 0, scaleFrom, fadeOut, ...rest }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const amplitude = window.matchMedia("(max-width: 640px)").matches ? 0.5 : 1;
    let frame = 0;
    let lastY = 0;

    const update = () => {
      frame = 0;
      // Measure the untransformed position, so the element's own offset never feeds back into the maths.
      const top = el.getBoundingClientRect().top - lastY;
      const height = el.offsetHeight;
      const vh = window.innerHeight;
      if (top + height < -vh * 0.25 || top > vh * 1.25) return;
      // -1 when the element's centre is a viewport below centre, 0 at centre, 1 a viewport above.
      const progress = clamp((vh / 2 - (top + height / 2)) / vh, -1, 1);
      const y = progress * speed * amplitude;
      lastY = y;
      const scale = scaleFrom ? scaleFrom + (1 - scaleFrom) * clamp(1 + progress * 1.6, 0, 1) : 1;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      if (fadeOut) el.style.opacity = String(clamp(1 - Math.max(0, -top) / (height * 0.9), 0, 1).toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed, scaleFrom, fadeOut]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)} {...rest}>
      {children}
    </div>
  );
}
