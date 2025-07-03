"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, 'ref'> {
  className?: string;
}

const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  AnimatedCardProps
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    whileHover={{ scale: 1.02, y: -5 }}
    transition={{ type: "spring", stiffness: 400, damping: 10 }}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className,
    )}
    {...props}
  />
));
AnimatedCard.displayName = "AnimatedCard";

export { AnimatedCard };
