import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover text-white shadow-md shadow-blue-100",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
  outline:
    "border-2 border-border hover:border-primary hover:text-primary bg-transparent",
  ghost: "hover:bg-gray-100 text-gray-700",
  danger: "bg-red-500 hover:bg-red-600 text-white",
};

const sizeClass = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm font-semibold rounded-xl",
  lg: "px-6 py-3.5 text-base font-bold rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled ?? loading}
      className={`
        inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass[variant]} ${sizeClass[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-xl">
          progress_activity
        </span>
      ) : (
        children
      )}
    </button>
  ),
);
Button.displayName = "Button";
