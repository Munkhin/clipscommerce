import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, buttonVariants } from '../button';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render a button with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('should render children correctly', () => {
      render(
        <Button>
          <span>Icon</span>
          Button Text
        </Button>
      );
      
      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'shadow');
    });

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('border', 'border-input', 'bg-background');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
    });

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('text-primary', 'underline-offset-4', 'hover:underline');
    });
  });

  describe('Sizes', () => {
    it('should apply default size styles', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-9', 'px-4', 'py-2');
    });

    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-8', 'rounded-md', 'px-3', 'text-xs');
    });

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-10', 'rounded-md', 'px-8');
    });

    it('should apply icon size styles', () => {
      render(<Button size="icon">🔍</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('h-9', 'w-9');
    });
  });

  describe('AsChild Prop', () => {
    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveTextContent('Link Button');
      expect(link).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });

    it('should render as button when asChild is false', () => {
      render(<Button asChild={false}>Regular Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Regular Button');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through standard button attributes', () => {
      render(
        <Button
          type="submit"
          disabled
          aria-label="Submit form"
          data-testid="submit-button"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Submit form');
      expect(button).toHaveAttribute('data-testid', 'submit-button');
    });

    it('should handle onClick events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1', 'focus-visible:ring-ring');
    });

    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(button).toHaveFocus();
    });

    it('should support aria attributes', () => {
      render(
        <Button
          aria-expanded="false"
          aria-haspopup="true"
          aria-controls="menu"
        >
          Menu
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });

    it('should have proper disabled state styling', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
      expect(button).toBeDisabled();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Ref Button');
    });

    it('should forward ref when using asChild', () => {
      const ref = React.createRef<HTMLAnchorElement>();
      render(
        <Button asChild ref={ref}>
          <a href="/test">Link with ref</a>
        </Button>
      );
      
      expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
      expect(ref.current?.href).toContain('/test');
    });
  });

  describe('Variant and Size Combinations', () => {
    it('should combine variant and size classes correctly', () => {
      render(<Button variant="outline" size="lg">Large Outline</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('border', 'border-input'); // outline variant
      expect(button).toHaveClass('h-10', 'px-8'); // large size
    });

    it('should handle all variant and size combinations', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const { unmount } = render(
            <Button variant={variant} size={size}>
              {variant}-{size}
            </Button>
          );
          
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          expect(button).toHaveTextContent(`${variant}-${size}`);
          
          unmount();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle null children', () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
    });

    it('should handle undefined props gracefully', () => {
      render(<Button variant={undefined} size={undefined}>Undefined props</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary'); // should use default variant
      expect(button).toHaveClass('h-9'); // should use default size
    });

    it('should handle very long text content', () => {
      const longText = 'A'.repeat(1000);
      render(<Button>{longText}</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(longText);
    });
  });

  describe('Performance', () => {
    it('should render quickly with many buttons', () => {
      const startTime = performance.now();
      
      render(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <Button key={i}>Button {i}</Button>
          ))}
        </div>
      );
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(<Button>Test</Button>);
      unmount();
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Button Variants Function', () => {
    it('should generate correct classes for default variant and size', () => {
      const classes = buttonVariants();
      
      expect(classes).toContain('bg-primary');
      expect(classes).toContain('text-primary-foreground');
      expect(classes).toContain('h-9');
      expect(classes).toContain('px-4');
    });

    it('should generate correct classes for custom variant and size', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
      
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('h-10');
      expect(classes).toContain('px-8');
    });

    it('should merge custom className', () => {
      const classes = buttonVariants({ className: 'custom-class' });
      
      expect(classes).toContain('custom-class');
      expect(classes).toContain('bg-primary'); // should still include default styles
    });
  });
}); 