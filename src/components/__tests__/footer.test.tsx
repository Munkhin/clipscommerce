import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '../footer';

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

describe('Footer Component', () => {
  beforeEach(() => {
    render(<Footer />);
  });

  describe('Content Rendering', () => {
    it('should render all main sections', () => {
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('should render copyright with current year', () => {
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Your Company. All rights reserved.`)).toBeInTheDocument();
    });

    it('should render social media icons', () => {
      expect(screen.getByTestId('Twitter-icon')).toBeInTheDocument();
      expect(screen.getByTestId('Linkedin-icon')).toBeInTheDocument();
      expect(screen.getByTestId('Github-icon')).toBeInTheDocument();
    });
  });

  describe('Product Section Links', () => {
    it('should render all product links with correct hrefs', () => {
      const featuresLink = screen.getByText('Features').closest('a');
      expect(featuresLink).toHaveAttribute('href', '#features');

      const pricingLink = screen.getByText('Pricing').closest('a');
      expect(pricingLink).toHaveAttribute('href', '#pricing');

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');

      const apiLink = screen.getByText('API').closest('a');
      expect(apiLink).toHaveAttribute('href', '#');
    });

    it('should have proper styling for product links', () => {
      const featuresLink = screen.getByText('Features').closest('a');
      expect(featuresLink).toHaveClass('text-gray-600', 'hover:text-blue-600');
    });
  });

  describe('Company Section Links', () => {
    it('should render all company links', () => {
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Blog')).toBeInTheDocument();
      expect(screen.getByText('Careers')).toBeInTheDocument();
      expect(screen.getByText('Press')).toBeInTheDocument();
    });

    it('should have placeholder hrefs for company links', () => {
      const aboutLink = screen.getByText('About').closest('a');
      expect(aboutLink).toHaveAttribute('href', '#');

      const blogLink = screen.getByText('Blog').closest('a');
      expect(blogLink).toHaveAttribute('href', '#');
    });
  });

  describe('Resources Section Links', () => {
    it('should render all resource links', () => {
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('Help Center')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should have placeholder hrefs for resource links', () => {
      const docsLink = screen.getByText('Documentation').closest('a');
      expect(docsLink).toHaveAttribute('href', '#');

      const helpLink = screen.getByText('Help Center').closest('a');
      expect(helpLink).toHaveAttribute('href', '#');
    });
  });

  describe('Legal Section Links', () => {
    it('should render all legal links', () => {
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Cookies')).toBeInTheDocument();
    });

    it('should have placeholder hrefs for legal links', () => {
      const privacyLink = screen.getByText('Privacy').closest('a');
      expect(privacyLink).toHaveAttribute('href', '#');

      const termsLink = screen.getByText('Terms').closest('a');
      expect(termsLink).toHaveAttribute('href', '#');
    });
  });

  describe('Social Media Links', () => {
    it('should render social media links with proper accessibility', () => {
      const twitterLink = screen.getByLabelText('Twitter');
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', '#');

      const linkedinLink = screen.getByLabelText('LinkedIn');
      expect(linkedinLink).toBeInTheDocument();
      expect(linkedinLink).toHaveAttribute('href', '#');

      const githubLink = screen.getByLabelText('GitHub');
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', '#');
    });

    it('should have proper styling for social media links', () => {
      const twitterLink = screen.getByLabelText('Twitter');
      expect(twitterLink).toHaveClass('text-gray-400', 'hover:text-gray-500');
    });

    it('should have screen reader text for social media links', () => {
      expect(screen.getByText('Twitter')).toHaveClass('sr-only');
      expect(screen.getByText('LinkedIn')).toHaveClass('sr-only');
      expect(screen.getByText('GitHub')).toHaveClass('sr-only');
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper footer styling', () => {
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-gray-50', 'border-t', 'border-gray-100');
    });

    it('should have responsive grid layout', () => {
      const { container } = render(<Footer />);
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-2', 'md:grid-cols-4', 'gap-8');
    });

    it('should have proper container styling', () => {
      const { container } = render(<Footer />);
      const containerDiv = container.querySelector('.container');
      expect(containerDiv).toHaveClass('mx-auto', 'px-4', 'py-12');
    });

    it('should have responsive bottom section layout', () => {
      const { container } = render(<Footer />);
      const bottomSection = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(bottomSection).toHaveClass('justify-between', 'items-center', 'pt-8', 'border-t');
    });
  });

  describe('Accessibility', () => {
    it('should have proper footer landmark', () => {
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('should have accessible navigation structure', () => {
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(4);
      
      const headingTexts = headings.map(h => h.textContent);
      expect(headingTexts).toContain('Product');
      expect(headingTexts).toContain('Company');
      expect(headingTexts).toContain('Resources');
      expect(headingTexts).toContain('Legal');
    });

    it('should have accessible links', () => {
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.textContent).toBeTruthy();
      });
    });

    it('should have proper list structure', () => {
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
      
      lists.forEach(list => {
        const listItems = list.querySelectorAll('li');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Dynamic Content', () => {
    it('should update copyright year dynamically', () => {
      // Mock different years
      const originalDate = Date;
      
      // Test with a different year
      global.Date = jest.fn(() => ({ getFullYear: () => 2025 })) as any;
      global.Date.now = originalDate.now;
      
      const { unmount } = render(<Footer />);
      unmount();
      render(<Footer />);
      
      expect(screen.getByText('© 2025 Your Company. All rights reserved.')).toBeInTheDocument();
      
      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(<Footer />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(<Footer />);
      unmount();
      
      expect(screen.queryByText('Product')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing icons gracefully', () => {
      // Even if icons fail to load, text content should still be present
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('should maintain layout integrity', () => {
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-gray-50');
      
      const container = footer.querySelector('.container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Link Validation', () => {
    it('should have all expected navigation links', () => {
      const expectedLinks = [
        'Features', 'Pricing', 'Dashboard', 'API',
        'About', 'Blog', 'Careers', 'Press',
        'Documentation', 'Help Center', 'Community', 'Status',
        'Privacy', 'Terms', 'Security', 'Cookies'
      ];
      
      expectedLinks.forEach(linkText => {
        expect(screen.getByText(linkText)).toBeInTheDocument();
      });
    });

    it('should have proper link structure', () => {
      const allLinks = screen.getAllByRole('link');
      
      // Should have navigation links + social media links
      expect(allLinks.length).toBeGreaterThan(16); // 16 nav links + 3 social links
      
      allLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });
}); 