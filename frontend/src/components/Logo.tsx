/**
 * JobPilot mark: a rising career path that links three milestones and ends in an
 * upward arrow, drawn as a "J". Custom SVG, so it doesn't look like any other brand.
 */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="jp-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#jp-bg)" />
      {/* the path: down the J and back up, like a journey */}
      <path
        d="M25 10v12.5a7 7 0 0 1-14 0"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* milestones */}
      <circle cx="11" cy="22.5" r="2.6" fill="#fff" />
      <circle cx="18" cy="29.5" r="1.9" fill="#fff" opacity="0.85" />
      {/* arrow head at the top: always moving up */}
      <path d="M20.5 13.5 25 9l4.5 4.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Brand mark + name. Not a link: the menu has a separate "Home" item. */
export default function Logo() {
  return (
    <div className="group flex select-none items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
      <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
        <LogoMark />
      </span>
      <span>
        Job<span className="text-gradient">Pilot</span>
      </span>
    </div>
  );
}
