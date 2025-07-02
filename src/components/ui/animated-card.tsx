import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
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
