"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Keeps the last non-empty message while a closing error collapses, so the text doesn't vanish first. */
function useLastMessage(message?: string) {
  const last = useRef(message);
  if (message) last.current = message;
  return last.current;
}

export const inputClass =
  "block w-full rounded-lg border border-border bg-surface px-3 text-sm text-text shadow-xs " +
  "placeholder:text-subtle/80 transition-[border-color,box-shadow] duration-150 " +
  "hover:border-border-strong focus:border-accent/70 focus:outline-none focus:ring-[3px] focus:ring-[var(--ring-soft)] " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15 disabled:cursor-not-allowed disabled:opacity-60 " +
  "h-10 pointer-coarse:h-11 pointer-coarse:text-base";

/** For inputs that sit inside a bordered container which shows the focus state instead. */
export const bareInputClass =
  "block h-10 w-full rounded-lg bg-transparent px-3 text-sm text-text placeholder:text-subtle/80 focus:outline-none pointer-coarse:h-11 pointer-coarse:text-base";

export const textareaClass = cn(inputClass, "h-auto py-2.5 leading-relaxed pointer-coarse:h-auto resize-y");

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactElement<Record<string, unknown>>;
};

/** Wires label, hint and error to the input via id / aria-describedby / aria-invalid. */
export function Field({ label, hint, error, required, optional, className, action, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const shownError = useLastMessage(error);
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: (children.props.id as string) ?? id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })
    : children;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={(children.props.id as string) ?? id} className="text-[13px] font-medium text-text">
          {label}
          {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
        </label>
        {action}
      </div>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      )}
      <div className="collapse-y" data-open={!!error}>
        <div>
          <p id={errorId} className="flex items-center gap-1.5 pt-1.5 text-xs font-medium text-danger">
            <AlertCircle size={13} className="shrink-0" />
            {shownError}
          </p>
        </div>
      </div>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(textareaClass, className)} {...props} />;
  },
);

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={visible ? "text" : "password"} className={cn(inputClass, "pr-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-subtle transition-colors hover:text-text"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);

/** Form-level error banner that expands smoothly instead of pushing content in one frame. */
export function FormError({ message }: { message?: string }) {
  const shown = useLastMessage(message);
  return (
    <div className="collapse-y" data-open={!!message} role="alert" aria-live="assertive">
      <div>
        <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{shown}</span>
        </div>
      </div>
    </div>
  );
}
