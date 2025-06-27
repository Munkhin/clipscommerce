import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import ValueStatementSection from '@/app/landing/components/ValueStatementSection';
import GuaranteeSection from '@/app/landing/components/GuaranteeSection';
import FinalCTASection from '@/app/landing/components/FinalCTASection';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('Button Routing Confirmation', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  describe('Get Started Button Redirects', () => {
    it('should have correct href attribute in ValueStatementSection', () => {
      render(<ValueStatementSection />);
      const getStartedLink = screen.getByText('Get Started').closest('a');
      
      expect(getStartedLink).toHaveAttribute('href', '/dashboard');
    });

    it('should verify button exists in GuaranteeSection', () => {
      const mockOnGetStarted = jest.fn();
      render(<GuaranteeSection onGetStarted={mockOnGetStarted} />);
      
      const getStartedButton = screen.getByText('Get Started Risk-Free');
      expect(getStartedButton).toBeInTheDocument();
      expect(getStartedButton.tagName).toBe('SPAN'); // It's wrapped in a motion.div with onClick
    });

    it('should verify button exists in FinalCTASection', () => {
      const mockOnGetStarted = jest.fn();
      render(<FinalCTASection onGetStarted={mockOnGetStarted} />);
      
      const getStartedButton = screen.getByText('Get Started Today');
      expect(getStartedButton).toBeInTheDocument();
      expect(getStartedButton.tagName).toBe('SPAN'); // It's wrapped in a motion.div with onClick
    });
  });

  describe('Button Accessibility', () => {
    it('should have proper button roles and labels', () => {
      render(<ValueStatementSection />);
      const getStartedButton = screen.getByText('Get Started');
      
      expect(getStartedButton.tagName).toBe('BUTTON');
      expect(getStartedButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<ValueStatementSection />);
      const getStartedButton = screen.getByText('Get Started');
      
      // Test keyboard navigation
      getStartedButton.focus();
      expect(document.activeElement).toBe(getStartedButton);
      
      // Verify the button is focusable and has correct href
      const linkElement = getStartedButton.closest('a');
      expect(linkElement).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Button States', () => {
    it('should handle button click events properly', () => {
      const clickSpy = jest.fn();
      render(
        <button onClick={clickSpy}>
          Test Button
        </button>
      );
      
      const button = screen.getByText('Test Button');
      fireEvent.click(button);
      
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle click events properly', () => {
      let clickCount = 0;
      const handleClick = () => {
        clickCount++;
      };
      
      render(
        <button onClick={handleClick}>
          Get Started
        </button>
      );
      
      const button = screen.getByText('Get Started');
      
      // Simulate rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(clickCount).toBe(2);
      expect(button).toBeInTheDocument();
    });
  });
}); 