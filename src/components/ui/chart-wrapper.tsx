import React from "react";
import { ResponsiveContainer } from "recharts";

interface ChartWrapperProps {
  children: React.ReactElement;
  /** optional dark background flag */
  dark?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Wrapper that ensures charts inherit brand colors and responsive layout.
 * Use in place of direct <ResponsiveContainer>.
 */
export function ChartWrapper({ children, dark = false, className, title, description }: ChartWrapperProps) {
  return (
    <div className={className + " w-full h-full"} style={{ color: "hsl(var(--foreground))" }}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
} 