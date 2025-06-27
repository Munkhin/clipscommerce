import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      body: ['Open Sans', 'sans-serif'],
      mono: ['Space Mono', 'monospace'],
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Custom Color Palette from globals.css
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          "amethyst-purple": 'var(--accent-amethyst-purple)',
          "cerulean-blue": 'var(--accent-cerulean-blue)',
          "orange-peel": 'var(--accent-orange-peel)',
          gold: 'var(--accent-gold)',
          "success-green": 'var(--accent-success-green)',
          "error-red": 'var(--accent-error-red)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Specific shades for backgrounds
        'background-primary': 'hsl(var(--background-primary))',
        'background-darkest': 'hsl(var(--background-darkest))',
        'background-lighter-dark': 'hsl(var(--background-lighter-dark))',

        // Specific shades for text
        'text-primary-light': 'hsl(var(--text-primary-light))',
        'text-primary-medium': 'hsl(var(--text-primary-medium))',
        'text-secondary-muted': 'hsl(var(--text-secondary-muted))',
        'text-secondary-dim': 'hsl(var(--text-secondary-dim))',

        // Specific accent colors
        'accent-amethyst-purple': 'hsl(var(--accent-amethyst-purple))',
        'accent-cerulean-blue': 'hsl(var(--accent-cerulean-blue))',
        'accent-orange-peel': 'hsl(var(--accent-orange-peel))',
        'accent-gold': 'hsl(var(--accent-gold))',
        'accent-success-green': 'hsl(var(--accent-success-green))',
        'accent-error-red': 'hsl(var(--accent-error-red))',

        // Additional semantic colors if needed
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },

        // ClipsCommerce Theme Colors
        charcoal: {
          DEFAULT: '#1a1a1a',
          50: '#2d2d2d',
          100: '#1a1a1a',
        },
        mint: {
          DEFAULT: '#00e5a0',
          foreground: '#002b1e',
        },
        lavender: {
          DEFAULT: '#b794f6',
          foreground: '#3f2b6f',
        },
        coral: {
          DEFAULT: '#ff6b6b',
          foreground: '#3f0b0b',
        },
        info: {
          DEFAULT: '#4fd1c7',
          foreground: '#083d3b',
        },

        // Preserving 'blitz' colors for now, review if still needed.
        'blitz': {
          blue: 'hsl(214, 100%, 50%)',
          purple: 'hsl(270, 100%, 50%)', // Note: This is now secondary.DEFAULT
          yellow: 'hsl(51, 100%, 50%)',
          teal: 'hsl(180, 100%, 50%)',
          red: 'hsl(0, 100%, 50%)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: 'fadeIn 0.8s ease-out forwards',
        slideUp: 'slideUp 0.8s ease-out forwards',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addComponents }: { addComponents: (components: Record<string, any>) => void }) {
      addComponents({
        '.bg-brand-gradient': {
          background: 'linear-gradient(135deg, hsl(var(--accent-amethyst-purple)) 0%, hsl(var(--accent-cerulean-blue)) 100%)',
        },
        '.text-brand-gradient': {
          background: 'linear-gradient(135deg, hsl(var(--accent-amethyst-purple)) 0%, hsl(var(--accent-cerulean-blue)) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        },
        '.bg-glass-card': {
          backgroundColor: 'rgba(var(--glass-base-r), var(--glass-base-g), var(--glass-base-b), var(--glass-base-a))',
          backdropFilter: 'blur(12px)',
          border: '1px solid hsl(var(--border-default))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        },
        '.bg-glass-card-hover': {
          backgroundColor: 'rgba(var(--glass-hover-r), var(--glass-hover-g), var(--glass-hover-b), var(--glass-hover-a))',
          backdropFilter: 'blur(16px)',
          border: '1px solid hsl(var(--border-glow))',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        },
      });
    },
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
} satisfies Config;

export default config;
