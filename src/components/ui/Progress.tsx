import React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  showLabel?: boolean;
  animated?: boolean;
  colorVariant?: "primary" | "success" | "warning" | "emerald";
  className?: string;
}

export function Progress({
  value,
  showLabel = false,
  animated = true,
  colorVariant = "primary",
  className = "",
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`app-progress-wrapper ${className}`} {...props}>
      <div className="app-progress-track">
        <div
          className={`app-progress-fill progress-${colorVariant} ${
            animated ? "is-animated" : ""
          }`}
          style={{ width: `${clampedValue}%` }}
        >
          {animated && <span className="progress-glow-bar" />}
        </div>
      </div>
      {showLabel && (
        <span className="app-progress-label">{clampedValue.toFixed(1)}%</span>
      )}
    </div>
  );
}
