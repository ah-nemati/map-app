import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "glass" | "bordered" | "highlight" | "compact";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) {
  return (
    <div className={`app-card card-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
}
