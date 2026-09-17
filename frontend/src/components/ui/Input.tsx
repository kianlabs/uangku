import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy || undefined}
          className={[
            "h-12 w-full rounded-[11px] border bg-surface px-4 text-base text-text placeholder:text-muted",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors",
            error ? "border-danger focus:ring-danger" : "border-border",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-sm text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
