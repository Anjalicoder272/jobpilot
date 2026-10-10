// A tiny confetti burst made of plain DOM elements: no library needed.
const EXTRA = ["#f59e0b", "#10b981", "#38bdf8"];

export function fireConfetti(count = 90) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Use the current palette's colors, plus a few cheerful extras.
  const css = getComputedStyle(document.documentElement);
  const COLORS = [...["--brand", "--brand-2", "--brand-3"].map((v) => css.getPropertyValue(v).trim()), ...EXTRA];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty("--dur", `${1.6 + Math.random() * 1.6}s`);
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3600);
  }
}
