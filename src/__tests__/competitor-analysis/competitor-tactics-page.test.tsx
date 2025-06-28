import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompetitorTacticsPage from '@/app/dashboard/competitor-tactics/page';
import { CompetitorAnalysisService } from '@/services/competitorAnalysisService';

// Mock the competitor analysis service
jest.mock('@/services/competitorAnalysisService');

const MockedCompetitorAnalysisService = CompetitorAnalysisService as jest.MockedClass<typeof CompetitorAnalysisService>;

describe('CompetitorTacticsPage', () => {
  const mockCompetitorData = [
    {
      id: "test-1",
      name: "Test Competitor",
      handle: "@testcompetitor",
      followers: "1.2M",
      engagement: "8.5%",
      avgViews: "120K",
      topContent: [
        {
          id: "content-1",
          title: "Test Video Title",
          views: "2.1M",
          engagement: "12.3%",
          url: "https://www.tiktok.com/@test/video/123",
          platform: "tiktok" as const
        }
      ],
      tactics: [
        "Posts consistently during peak hours",
        "Uses trending hashtags effectively"
      ],
      hooks: [
        "How I achieved [result] in [timeframe]",
        "The secret that changed everything"
      ]
    }
  ];

  let mockServiceInstance: jest.Mocked<CompetitorAnalysisService>;

  beforeEach(() => {
    mockServiceInstance = {
      getTopCompetitors: jest.fn(),
      getCompetitorInsights: jest.fn(),
      saveCompetitorAnalysis: jest.fn()
    } as jest.Mocked<CompetitorAnalysisService>;

    MockedCompetitorAnalysisService.mockImplementation(() => mockServiceInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Loading', () => {
    it('should display loading state initially', () => {
      mockServiceInstance.getTopCompetitors.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<CompetitorTacticsPage />);

      expect(screen.getByText('Analyzing Top Competitors')).toBeInTheDocument();
      expect(screen.getByText('Scanning viral content in your niche...')).toBeInTheDocument();
    });

    it('should load and display competitor data successfully', async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: true,
        data: mockCompetitorData
      });

      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Competitor')).toBeInTheDocument();
        expect(screen.getByText('@testcompetitor')).toBeInTheDocument();
        expect(screen.getByText('1.2M')).toBeInTheDocument();
        expect(screen.getByText('8.5% avg')).toBeInTheDocument();
      });

      expect(mockServiceInstance.getTopCompetitors).toHaveBeenCalledWith({
        limit: 5,
        platform: 'all'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: false,
        error: 'API Error: Failed to fetch data'
      });

      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('API Error: Failed to fetch data')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockServiceInstance.getTopCompetitors.mockRejectedValue(
        new Error('Network error')
      );

      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load competitor data. Please check your connection/)).toBeInTheDocument();
      });
    });
  });

  describe('Competitor Display', () => {
    beforeEach(async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: true,
        data: mockCompetitorData
      });
    });

    it('should display competitor metrics correctly', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Competitor')).toBeInTheDocument();
      });

      // Check metrics display
      expect(screen.getByText('1.2M')).toBeInTheDocument(); // followers
      expect(screen.getByText('8.5% avg')).toBeInTheDocument(); // engagement
      expect(screen.getByText('120K avg views')).toBeInTheDocument(); // avg views
    });

    it('should display top performing content', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Video Title')).toBeInTheDocument();
        expect(screen.getByText('2.1M views • 12.3% engagement')).toBeInTheDocument();
      });
    });

    it('should display winning tactics', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('• Posts consistently during peak hours')).toBeInTheDocument();
        expect(screen.getByText('• Uses trending hashtags effectively')).toBeInTheDocument();
      });
    });

    it('should display high-converting hooks', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('"How I achieved [result] in [timeframe]"')).toBeInTheDocument();
        expect(screen.getByText('"The secret that changed everything"')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    beforeEach(async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: true,
        data: mockCompetitorData
      });
    });

    it('should allow refreshing data', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Competitor')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      expect(mockServiceInstance.getTopCompetitors).toHaveBeenCalledTimes(2);
    });

    it('should open external links when clicking view content button', async () => {
      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      });

      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Video Title')).toBeInTheDocument();
      });

      // Find and click the external link button
      const externalLinkButtons = screen.getAllByRole('button', { name: '' });
      const externalLinkButton = externalLinkButtons.find(button => 
        button.querySelector('svg') !== null
      );

      if (externalLinkButton) {
        fireEvent.click(externalLinkButton);
        expect(mockOpen).toHaveBeenCalledWith(
          'https://www.tiktok.com/@test/video/123',
          '_blank'
        );
      }
    });

    it('should copy hooks to clipboard when clicking copy button', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });

      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('"How I achieved [result] in [timeframe]"')).toBeInTheDocument();
      });

      // Find hook container and hover to show copy button
      const hookContainer = screen.getByText('"How I achieved [result] in [timeframe]"').closest('div');
      if (hookContainer) {
        fireEvent.mouseEnter(hookContainer);
        
        // Find and click copy button
        const copyButtons = screen.getAllByRole('button', { name: '' });
        const copyButton = copyButtons.find(button => 
          button.querySelector('svg') !== null && 
          button.className.includes('group-hover:opacity-100')
        );

        if (copyButton) {
          fireEvent.click(copyButton);
          expect(mockWriteText).toHaveBeenCalledWith('How I achieved [result] in [timeframe]');
        }
      }
    });
  });

  describe('Platform Integration', () => {
    beforeEach(async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: true,
        data: mockCompetitorData
      });
    });

    it('should display platform badges correctly', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('tiktok')).toBeInTheDocument();
      });

      // Check for platform emoji
      expect(screen.getByText('🎵')).toBeInTheDocument(); // TikTok emoji
    });

    it('should apply correct platform colors', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        const platformBadge = screen.getByText('tiktok');
        expect(platformBadge).toHaveClass('from-pink-500', 'to-red-500');
      });
    });
  });

  describe('Insights Section', () => {
    beforeEach(async () => {
      mockServiceInstance.getTopCompetitors.mockResolvedValue({
        success: true,
        data: mockCompetitorData
      });
    });

    it('should display key insights section', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Key Insights Across Top Performers')).toBeInTheDocument();
        expect(screen.getByText('Common Patterns')).toBeInTheDocument();
        expect(screen.getByText('Hook Formulas')).toBeInTheDocument();
        expect(screen.getByText('Content Types')).toBeInTheDocument();
      });
    });

    it('should display static insights patterns', async () => {
      render(<CompetitorTacticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Post consistently during peak hours (6-8 PM)')).toBeInTheDocument();
        expect(screen.getByText('Use trending audio within 2 hours of release')).toBeInTheDocument();
        expect(screen.getByText('Tutorial/How-to (highest engagement)')).toBeInTheDocument();
      });
    });
  });
});