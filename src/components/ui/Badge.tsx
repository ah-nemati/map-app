import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "moving" | "idle";
  children: React.ReactNode;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  pulse = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span className={`app-badge badge-${variant} ${pulse ? "has-pulse" : ""} ${className}`} {...props}>
      {pulse && <span className="badge-pulse-dot" />}
      {children}
    </span>
  );
}
