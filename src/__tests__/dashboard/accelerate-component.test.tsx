import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccelerateComponent from '@/components/dashboard/AccelerateComponent';
import { useAuth } from '@/providers/AuthProvider';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UserVideoService } from '@/services/userVideoService';

// Mock dependencies
jest.mock('@/providers/AuthProvider');
jest.mock('@/hooks/useUsageLimits');
jest.mock('@/services/userVideoService');

const mockAuthProvider = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsageLimits = useUsageLimits as jest.MockedFunction<typeof useUsageLimits>;
const MockedUserVideoService = UserVideoService as jest.MockedClass<typeof UserVideoService>;

describe('AccelerateComponent', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  };

  const mockVideos = [
    {
      id: 'video-1',
      title: 'Test Video 1.mp4',
      status: 'uploaded' as const,
      columnId: 'todo',
      uploadedAt: '2024-01-01T00:00:00Z',
      loading: false
    },
    {
      id: 'video-2',
      title: 'Test Video 2.mov',
      status: 'processing' as const,
      columnId: 'processing',
      uploadedAt: '2024-01-01T01:00:00Z',
      loading: true,
      result: {
        sentiment: { score: 0.8, sentiment: 'positive' },
        tone: { tone: 'excited', confidence: 0.9 }
      }
    },
    {
      id: 'video-3',
      title: 'Test Video 3.avi',
      status: 'ready' as const,
      columnId: 'ready',
      uploadedAt: '2024-01-01T02:00:00Z',
      loading: false,
      result: {
        sentiment: { score: 0.7, sentiment: 'positive' },
        tone: { tone: 'professional', confidence: 0.85 },
        hashtags: ['#viral', '#trending'],
        viralityScore: 85,
        engagementPrediction: 92
      }
    }
  ];

  let mockServiceInstance: jest.Mocked<UserVideoService>;

  beforeEach(() => {
    mockServiceInstance = {
      getUserVideos: jest.fn(),
      uploadVideo: jest.fn(),
      deleteVideo: jest.fn(),
      retryVideoProcessing: jest.fn(),
      updateVideoStatus: jest.fn(),
      subscribeToVideoUpdates: jest.fn()
    } as jest.Mocked<UserVideoService>;

    MockedUserVideoService.mockImplementation(() => mockServiceInstance);

    mockAuthProvider.mockReturnValue({
      user: mockUser,
      signIn: jest.fn(),
      signOut: jest.fn(),
      loading: false,
      signUp: jest.fn()
    });

    mockUsageLimits.mockReturnValue({
      hasFeatureAccess: jest.fn().mockReturnValue(true),
      tier: 'pro'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Loading and Data Fetching', () => {
    it('should show loading state initially', () => {
      mockServiceInstance.getUserVideos.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AccelerateComponent />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should load and display user videos successfully', async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: mockVideos
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Test Video 1.mp4')).toBeInTheDocument();
        expect(screen.getByText('Test Video 2.mov')).toBeInTheDocument();
        expect(screen.getByText('Test Video 3.avi')).toBeInTheDocument();
      });

      expect(mockServiceInstance.getUserVideos).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle loading errors gracefully', async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to Load Accelerate/i)).toBeInTheDocument();
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
      });
    });

    it('should not load videos when user is not authenticated', async () => {
      mockAuthProvider.mockReturnValue({
        user: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        loading: false,
        signUp: jest.fn()
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Accelerate')).toBeInTheDocument();
      });

      expect(mockServiceInstance.getUserVideos).not.toHaveBeenCalled();
    });
  });

  describe('Video Organization by Columns', () => {
    beforeEach(async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: mockVideos
      });
    });

    it('should organize videos into correct columns', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('To Do / Uploaded')).toBeInTheDocument();
        expect(screen.getByText('AI Processing')).toBeInTheDocument();
        expect(screen.getByText('Review & Edit')).toBeInTheDocument();
        expect(screen.getByText('Ready to Post')).toBeInTheDocument();
      });

      // Check video counts in headers
      const columns = screen.getAllByText(/\d+ videos/);
      expect(columns).toHaveLength(4);
    });

    it('should display video cards with correct information', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        const video1 = screen.getByText('Test Video 1.mp4');
        expect(video1).toBeInTheDocument();

        const video2 = screen.getByText('Test Video 2.mov');
        expect(video2).toBeInTheDocument();
        
        const video3 = screen.getByText('Test Video 3.avi');
        expect(video3).toBeInTheDocument();
      });
    });

    it('should show processing indicators for loading videos', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        // Video 2 should show processing state
        expect(screen.getByText('processing')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    beforeEach(async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: []
      });
    });

    it('should handle file selection and upload', async () => {
      mockServiceInstance.uploadVideo.mockResolvedValue({
        success: true,
        videoId: 'new-video-id'
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Videos')).toBeInTheDocument();
      });

      // Create a mock file
      const file = new File(['video content'], 'test-video.mp4', {
        type: 'video/mp4'
      });

      // Find the hidden file input
      const fileInput = screen.getByRole('button', { name: /upload videos/i })
        .closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockServiceInstance.uploadVideo).toHaveBeenCalledWith(
          'test-user-id',
          {
            file,
            title: 'test-video.mp4'
          }
        );
      });
    });

    it('should handle upload errors', async () => {
      mockServiceInstance.uploadVideo.mockResolvedValue({
        success: false,
        error: 'File too large'
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Videos')).toBeInTheDocument();
      });

      const file = new File(['video content'], 'large-video.mp4', {
        type: 'video/mp4'
      });

      const fileInput = screen.getByRole('button', { name: /upload videos/i })
        .closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/File too large/i)).toBeInTheDocument();
      });
    });

    it('should show upload progress', async () => {
      // Mock delayed upload to see progress
      mockServiceInstance.uploadVideo.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({ success: true, videoId: 'new-id' }), 1000);
        })
      );

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Videos')).toBeInTheDocument();
      });

      const file = new File(['video content'], 'test-video.mp4', {
        type: 'video/mp4'
      });

      const fileInput = screen.getByRole('button', { name: /upload videos/i })
        .closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should show upload progress
      await waitFor(() => {
        expect(screen.getByText(/Upload Progress/i)).toBeInTheDocument();
      });
    });
  });

  describe('Video Management', () => {
    beforeEach(async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: mockVideos
      });
    });

    it('should handle video deletion', async () => {
      mockServiceInstance.deleteVideo.mockResolvedValue({
        success: true
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Test Video 1.mp4')).toBeInTheDocument();
      });

      // Find and click delete button (trash icon)
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find(button =>
        button.querySelector('svg')?.getAttribute('data-lucide') === 'trash-2'
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(mockServiceInstance.deleteVideo).toHaveBeenCalledWith(
            'video-1',
            'test-user-id'
          );
        });
      }
    });

    it('should handle video retry', async () => {
      const errorVideo = {
        ...mockVideos[0],
        status: 'error' as const,
        error: 'Processing failed',
        columnId: 'todo'
      };

      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: [errorVideo]
      });

      mockServiceInstance.retryVideoProcessing.mockResolvedValue({
        success: true
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Processing failed')).toBeInTheDocument();
      });

      // Find retry button in error component
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockServiceInstance.retryVideoProcessing).toHaveBeenCalledWith('video-1');
      });
    });
  });

  describe('Drag and Drop', () => {
    beforeEach(async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: mockVideos
      });
    });

    it('should support drag and drop functionality', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('Test Video 1.mp4')).toBeInTheDocument();
      });

      // Find drag handle (grip vertical icon)
      const dragHandles = screen.getAllByRole('button', { name: '' });
      const dragHandle = dragHandles.find(button =>
        button.querySelector('svg')?.getAttribute('data-lucide') === 'grip-vertical'
      );

      expect(dragHandle).toBeInTheDocument();
      expect(dragHandle).toHaveAttribute('aria-roledescription', 'sortable');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no videos are present', async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: []
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText(/No videos yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Upload your first video/i)).toBeInTheDocument();
      });
    });

    it('should show upload prompt in empty state', async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: []
      });

      render(<AccelerateComponent />);

      await waitFor(() => {
        const uploadPrompts = screen.getAllByText(/Upload/i);
        expect(uploadPrompts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Processing Results Display', () => {
    beforeEach(async () => {
      mockServiceInstance.getUserVideos.mockResolvedValue({
        success: true,
        data: mockVideos
      });
    });

    it('should display sentiment analysis results', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        expect(screen.getByText('positive')).toBeInTheDocument();
        expect(screen.getByText('excited')).toBeInTheDocument();
      });
    });

    it('should show circular score for sentiment', async () => {
      render(<AccelerateComponent />);

      await waitFor(() => {
        // Video with sentiment score should show circular progress
        const scoreElements = screen.getAllByRole('progressbar');
        expect(scoreElements.length).toBeGreaterThan(0);
      });
    });
  });
});