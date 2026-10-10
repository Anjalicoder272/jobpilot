import { cn, companyTint } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent-text border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-xl border border-border bg-surface shadow-xs", className)}>{children}</Tag>;
}

export function CardHeader({ title, description, icon, action }: { title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <span className="mt-0.5 text-subtle">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function CompanyAvatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-lg font-semibold text-white", className)}
      style={{ width: size, height: size, background: companyTint(name), fontSize: size * 0.4 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      {icon && (
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-muted shadow-xs">
          {icon}
        </span>
      )}
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h4 className={cn("text-xs font-medium uppercase tracking-wider text-subtle", className)}>{children}</h4>;
}
