import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactSection } from '../ContactSection';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Mail: (props: any) => <svg {...props} data-testid="Mail-icon" />,
  MessageSquare: (props: any) => <svg {...props} data-testid="MessageSquare-icon" />,
  Send: (props: any) => <svg {...props} data-testid="Send-icon" />,
  CheckCircle: (props: any) => <svg {...props} data-testid="CheckCircle-icon" />
}));

describe('ContactSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the contact section with default props', () => {
      render(<ContactSection />);
      
      expect(screen.getByTestId('contact-section')).toBeInTheDocument();
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Email *')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject *')).toBeInTheDocument();
      expect(screen.getByLabelText('Message *')).toBeInTheDocument();
    });

    it('should render without title when showTitle is false', () => {
      render(<ContactSection showTitle={false} />);
      
      expect(screen.queryByText('Get in Touch')).not.toBeInTheDocument();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<ContactSection className="custom-class" />);
      
      const section = screen.getByTestId('contact-section');
      expect(section).toHaveClass('contact-section', 'custom-class');
    });

    it('should render email contact information', () => {
      render(<ContactSection />);
      
      expect(screen.getByText('Or email us directly at')).toBeInTheDocument();
      expect(screen.getByText('support@clipscommerce.com')).toBeInTheDocument();
      
      const emailLink = screen.getByRole('link', { name: 'support@clipscommerce.com' });
      expect(emailLink).toHaveAttribute('href', 'mailto:support@clipscommerce.com');
    });
  });

  describe('Form Interaction', () => {
    it('should update form fields when user types', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      const nameInput = screen.getByLabelText('Name *');
      const emailInput = screen.getByLabelText('Email *');
      const subjectInput = screen.getByLabelText('Subject *');
      const messageInput = screen.getByLabelText('Message *');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(subjectInput, 'Test Subject');
      await user.type(messageInput, 'Test message');
      
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(subjectInput).toHaveValue('Test Subject');
      expect(messageInput).toHaveValue('Test message');
    });

    it('should submit form with valid data and show success message', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill out the form
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Test message that is long enough');
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText('Thank you for your message! We\'ll get back to you soon.')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Form should be reset
      expect(screen.getByLabelText('Name *')).toHaveValue('');
      expect(screen.getByLabelText('Email *')).toHaveValue('');
      expect(screen.getByLabelText('Subject *')).toHaveValue('');
      expect(screen.getByLabelText('Message *')).toHaveValue('');
    });

    it('should reset form when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill out the form
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      
      // Click reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);
      
      // Form should be cleared
      expect(screen.getByLabelText('Name *')).toHaveValue('');
      expect(screen.getByLabelText('Email *')).toHaveValue('');
    });

    it('should show character count for message field', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      const messageInput = screen.getByLabelText('Message *');
      
      // Initially shows 0 characters
      expect(screen.getByText('0/500 characters')).toBeInTheDocument();
      
      // Type some text
      await user.type(messageInput, 'Hello world');
      
      // Should update character count
      expect(screen.getByText('11/500 characters')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields on form submission', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Subject is required')).toBeInTheDocument();
        expect(screen.getByText('Message is required')).toBeInTheDocument();
      });
    });

    it('should validate email format on form submission', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill form with invalid email
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'invalid-email');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Test message that is long enough');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Check that form doesn't submit successfully (no success message should appear)
      await waitFor(() => {
        expect(screen.queryByText('Thank you for your message! We\'ll get back to you soon.')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Form should still have the invalid email value
      expect(screen.getByLabelText('Email *')).toHaveValue('invalid-email');
    });

    it('should validate message length on form submission', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill form with short message
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Hi');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Check for length validation error using getAllByText to handle multiple instances
      await waitFor(() => {
        const errorElements = screen.getAllByText('Message must be at least 10 characters long');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      
      // Start typing in name field
      const nameInput = screen.getByLabelText('Name *');
      await user.type(nameInput, 'J');
      
      // Name error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      });
    });

    it('should show validation feedback on form submission with mixed valid/invalid data', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill form with some valid and some invalid data
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'invalid');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Test message that is long enough');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Should not submit successfully due to invalid email
      await waitFor(() => {
        expect(screen.queryByText('Thank you for your message! We\'ll get back to you soon.')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Form should retain the invalid email value
      expect(screen.getByLabelText('Email *')).toHaveValue('invalid');
      
      // Should not show errors for valid fields
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Subject is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Message is required')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(<ContactSection />);
      
      // Check form has proper role and label
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Contact form');
      
      // Check all inputs have proper labels
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Email *')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject *')).toBeInTheDocument();
      expect(screen.getByLabelText('Message *')).toBeInTheDocument();
      
      // Check ARIA live region exists
      const liveRegion = screen.getByRole('form').querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      
      // Check that inputs are properly associated with error messages
      const nameInput = screen.getByLabelText('Name *');
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
      
      const nameError = screen.getByText('Name is required');
      expect(nameError).toHaveAttribute('id', 'name-error');
      expect(nameError).toHaveAttribute('role', 'alert');
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Submit empty form to trigger validation
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      
      // Check ARIA live region contains error messages
      const liveRegion = screen.getByRole('form').querySelector('[aria-live="polite"]');
      expect(liveRegion).toHaveTextContent('Name is required');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill out valid form
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Test message that is long enough');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);
      
      // Should show loading state briefly
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Thank you for your message! We\'ll get back to you soon.')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      render(<ContactSection />);
      
      // Fill out valid form
      await user.type(screen.getByLabelText('Name *'), 'John Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Subject *'), 'Test Subject');
      await user.type(screen.getByLabelText('Message *'), 'Test message that is long enough');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      const resetButton = screen.getByRole('button', { name: /reset/i });
      
      await user.click(submitButton);
      
      // Both buttons should be disabled during submission
      expect(submitButton).toBeDisabled();
      expect(resetButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Thank you for your message! We\'ll get back to you soon.')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
}); 