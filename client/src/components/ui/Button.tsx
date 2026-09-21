import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-muted active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-text hover:bg-surface-muted active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
};

const sizeStyles: Record<Size, string> = {
  md: "h-12 px-5 text-base",
  sm: "h-9 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
