import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-xs hover:bg-primary-hover",
  accent: "bg-accent text-white shadow-xs hover:bg-accent-hover dark:text-[#0c0c0e]",
  secondary: "border border-border bg-surface text-text shadow-xs hover:border-border-strong hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "border border-border bg-surface text-danger shadow-xs hover:border-danger/40 hover:bg-danger-soft",
  destructive: "bg-danger text-white shadow-xs hover:bg-danger/90 dark:text-[#1f0a0a]",
};

// Touch devices get 44px targets; precise pointers keep the denser desktop sizes.
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] pointer-coarse:h-10",
  md: "h-10 px-4 text-sm pointer-coarse:h-11",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9 pointer-coarse:h-11 pointer-coarse:w-11",
};

export function buttonClass({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

/** While loading, the label stays in place (invisible) so the button never changes width. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, className, children, type = "button", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2 transition-opacity duration-150", loading && "opacity-0")}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={16} />
        </span>
      )}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
