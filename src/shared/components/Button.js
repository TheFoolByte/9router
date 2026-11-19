"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white border-2 border-border shadow-hard-sm hover:shadow-hard active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none",
  secondary: "bg-surface-2 hover:bg-surface-3 text-text-main border-2 border-border shadow-hard-sm hover:shadow-hard active:shadow-none disabled:opacity-50 disabled:shadow-none",
  outline: "border-2 border-border text-text-main hover:bg-surface-2 shadow-hard-sm hover:shadow-hard active:shadow-none",
  ghost: "text-text-muted hover:bg-surface-2 hover:text-text-main",
  danger: "bg-danger hover:bg-danger/90 text-white border-2 border-border shadow-hard-sm hover:shadow-hard active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none",
  success: "bg-success hover:bg-success/90 text-white border-2 border-border shadow-hard-sm hover:shadow-hard active:shadow-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none",
};

const sizes = {
  xs: "h-6 px-2.5 text-[11px] rounded-none gap-1.5",
  sm: "h-7 px-3 text-xs rounded-none",
  md: "h-9 px-4 text-sm rounded-none",
  lg: "h-11 px-6 text-sm rounded-none",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-extrabold uppercase tracking-wide transition-all duration-100 ease-out cursor-pointer",
        "active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={cn("material-symbols-outlined animate-spin", size === "xs" ? "text-[14px]" : "text-[18px]")}>progress_activity</span>
      ) : icon ? (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{iconRight}</span>
      )}
    </button>
  );
}
