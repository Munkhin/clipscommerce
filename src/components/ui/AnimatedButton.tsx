'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // Assuming a utility for class concatenation

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Custom variants using the new palette
        primaryAccent: 'bg-accent-amethyst-purple text-text-primary-light hover:bg-accent-amethyst-purple/90',
        secondaryAccent: 'bg-accent-cerulean-blue text-text-primary-light hover:bg-accent-cerulean-blue/90',
        outlineAccent: 'border border-border-default text-text-primary-light hover:bg-background-lighter-dark',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface AnimatedButtonProps extends HTMLMotionProps<'button'>, VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  className,
  variant,
  size,
  children,
  ...props
}) => {
  return (
    <motion.button
      className={cn(buttonVariants({ variant, size, className }),
        // New hover styles for background and text
        "relative overflow-hidden group transition-all duration-300"
      )}
      whileHover={{ 
        y: -2, 
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        transition: { duration: 0.2, ease: "easeInOut" }
      }}
      whileTap={{ scale: 0.98, boxShadow: "none" }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      {
        ...props
      }
    >
      {/* Background gradient sweep on hover */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/20 group-hover:from-primary/20 group-hover:to-primary/40"
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {/* Text with color change */}
      <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-200">
        {children}
      </span>
      {/* Accent color ring pulse on click */}
      <motion.span
        className="absolute inset-0 rounded-md border-2 border-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        whileTap={{ opacity: 1, scale: 1.2, borderColor: "var(--accent-amethyst-purple)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
    </motion.button>
  );
};

export { AnimatedButton, buttonVariants }; 