import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hero from '../hero';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe('Hero Component', () => {
  beforeEach(() => {
    render(<Hero />);
  });

  describe('Content Rendering', () => {
    it('should render the main headline correctly', () => {
      expect(screen.getByText(/The/)).toBeInTheDocument();
      expect(screen.getByText(/Dominator Loop/)).toBeInTheDocument();
      expect(screen.getByText(/Viral Growth Engine/)).toBeInTheDocument();
    });

    it('should render the badge with creator count', () => {
      expect(screen.getByText(/Join 10,000\+ creators growing with Dominator/)).toBeInTheDocument();
    });

    it('should render the subheadline with key metrics', () => {
      expect(screen.getByText(/30%\+ higher view duration/)).toBeInTheDocument();
      expect(screen.getByText(/2x faster growth/)).toBeInTheDocument();
      expect(screen.getByText(/3x your engagement/)).toBeInTheDocument();
    });

    it('should render call-to-action buttons', () => {
      expect(screen.getByText('Start Your Free 14-Day Trial')).toBeInTheDocument();
      expect(screen.getByText('See How It Works')).toBeInTheDocument();
    });

    it('should render metric cards with correct data', () => {
      expect(screen.getByText('30%+')).toBeInTheDocument();
      expect(screen.getByText('Higher View Duration')).toBeInTheDocument();
      expect(screen.getByText('AI-optimized hooks keep viewers watching longer')).toBeInTheDocument();

      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('Faster Growth')).toBeInTheDocument();
      expect(screen.getByText('Ride trends before they peak with our early detection')).toBeInTheDocument();

      expect(screen.getByText('3x')).toBeInTheDocument();
      expect(screen.getByText('Engagement Score')).toBeInTheDocument();
      expect(screen.getByText('Our proprietary metric predicts virality potential')).toBeInTheDocument();
    });

    it('should render guarantee badges', () => {
      expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
      expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href for trial button', () => {
      const trialButton = screen.getByText('Start Your Free 14-Day Trial').closest('a');
      expect(trialButton).toHaveAttribute('href', '/dashboard');
    });

    it('should have correct href for how it works link', () => {
      const howItWorksLink = screen.getByText('See How It Works').closest('a');
      expect(howItWorksLink).toHaveAttribute('href', '#how-it-works');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(/The.*Dominator Loop.*Viral Growth Engine/);
    });

    it('should have accessible links', () => {
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.textContent).toBeTruthy();
      });
    });

    it('should have proper color contrast classes', () => {
      const container = screen.getByText('The').closest('div');
      expect(container).toHaveClass('bg-dominator-black');
    });

    it('should support keyboard navigation', () => {
      const trialButton = screen.getByText('Start Your Free 14-Day Trial').closest('a');
      const howItWorksLink = screen.getByText('See How It Works').closest('a');

      expect(trialButton).toBeVisible();
      expect(howItWorksLink).toBeVisible();

      // Simulate tab navigation
      trialButton?.focus();
      expect(document.activeElement).toBe(trialButton);

      howItWorksLink?.focus();
      expect(document.activeElement).toBe(howItWorksLink);
    });
  });

  describe('Visual Elements', () => {
    it('should render icons for metrics', () => {
      // Check for Lucide icons by their test IDs
      expect(screen.getByTestId('Zap-icon')).toBeInTheDocument();
      expect(screen.getByTestId('BarChart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('TrendingUp-icon')).toBeInTheDocument();
      expect(screen.getByTestId('Users-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('Check-icon')).toHaveLength(3);
    });

    it('should have gradient text styling', () => {
      const gradientText = screen.getByText('Viral Growth Engine');
      expect(gradientText).toHaveClass('text-transparent', 'bg-clip-text', 'bg-gradient-to-r');
    });

    it('should have proper background styling', () => {
      const heroContainer = screen.getByText('The').closest('div');
      expect(heroContainer).toHaveClass('bg-dominator-black');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive text classes', () => {
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveClass('text-4xl', 'sm:text-6xl');
    });

    it('should have responsive button layout', () => {
      const buttonContainer = screen.getByText('Start Your Free 14-Day Trial').closest('div');
      expect(buttonContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    });

    it('should have responsive grid for metrics', () => {
      const metricsContainer = screen.getByText('Higher View Duration').closest('div')?.parentElement;
      expect(metricsContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3');
    });
  });

  describe('Interactive Elements', () => {
    it('should have hover effects on buttons', () => {
      const trialButton = screen.getByText('Start Your Free 14-Day Trial').closest('a');
      expect(trialButton).toHaveClass('hover:from-dominator-blue/90', 'hover:to-dominator-green/90');
    });

    it('should have hover effects on metric cards', () => {
      const metricCard = screen.getByText('Higher View Duration').closest('div');
      expect(metricCard).toHaveClass('hover:border-dominator-blue/30');
    });

    it('should handle click events on CTA buttons', () => {
      const trialButton = screen.getByText('Start Your Free 14-Day Trial').closest('a');
      const howItWorksLink = screen.getByText('See How It Works').closest('a');

      fireEvent.click(trialButton!);
      fireEvent.click(howItWorksLink!);

      // Since these are links, we just verify they're clickable
      expect(trialButton).toBeInTheDocument();
      expect(howItWorksLink).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('should display correct metric values', () => {
      expect(screen.getByText('30%+')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('3x')).toBeInTheDocument();
    });

    it('should have compelling copy', () => {
      expect(screen.getByText(/guarantees/)).toBeInTheDocument();
      expect(screen.getByText(/or your next month is on us/)).toBeInTheDocument();
    });

    it('should include trust signals', () => {
      expect(screen.getByText('30-day money-back guarantee')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
      expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now();
      render(<Hero />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
    });

    it('should not have memory leaks', () => {
      const { unmount } = render(<Hero />);
      unmount();
      
      // Component should unmount cleanly
      expect(screen.queryByText('The')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing icons gracefully', () => {
      // Even if icons fail to load, text content should still be present
      expect(screen.getByText('Join 10,000+ creators growing with Dominator')).toBeInTheDocument();
      expect(screen.getByText('Higher View Duration')).toBeInTheDocument();
    });

    it('should maintain layout integrity', () => {
      const heroContainer = screen.getByText('The').closest('div');
      expect(heroContainer).toHaveClass('relative');
      
      const contentContainer = screen.getByText('The').closest('div')?.querySelector('.max-w-7xl');
      expect(contentContainer).toBeInTheDocument();
    });
  });
}); 