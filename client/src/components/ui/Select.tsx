import { type SelectHTMLAttributes, forwardRef, useId } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = "", id: providedId, children, ...props }, ref) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy || undefined}
            className={[
              "h-12 w-full appearance-none rounded-xl border bg-surface px-4 pr-10 text-base text-text",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error ? "border-danger focus:ring-danger" : "border-border",
              className,
            ].join(" ")}
            {...props}
          >
            {children}
          </select>
          {/* chevron icon */}
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
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

Select.displayName = "Select";
