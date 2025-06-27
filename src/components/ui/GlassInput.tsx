'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const GlassInput: React.FC<GlassInputProps> = ({
  className,
  label,
  error,
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(e.target.value.length > 0);
  };

  return (
    <div className="relative">
      <input
        className={cn(
          'w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent-amethyst-purple focus:border-transparent transition-all duration-300',
          className
        )}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      
      {label && (
        <motion.label
          className={cn(
            'absolute left-4 text-muted-foreground pointer-events-none transition-all duration-300',
            isFocused || hasValue
              ? 'top-1 text-xs text-accent-amethyst-purple'
              : 'top-3 text-base'
          )}
          animate={{
            y: isFocused || hasValue ? -8 : 0,
            scale: isFocused || hasValue ? 0.8 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {label}
        </motion.label>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-accent-error-red">{error}</p>
      )}
    </div>
  );
};

export default GlassInput; 