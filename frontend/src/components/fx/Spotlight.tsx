"use client";

/** Wraps content in a card whose soft glow follows the mouse pointer. */
export default function Spotlight({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  function onMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }
  return (
    <Tag onMouseMove={onMove} className={`spotlight ${className}`}>
      {children}
    </Tag>
  );
}
