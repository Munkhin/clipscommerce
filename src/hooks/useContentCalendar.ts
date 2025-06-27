import { useState, useEffect, useCallback, useMemo } from 'react';
import { addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, addWeeks, subWeeks } from 'date-fns';
import { Platform } from '@/types/platform';
import { Post, PostStatus } from '@/types/schedule';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  formattedDate: string;
  posts: Post[];
}

interface UseContentCalendarProps {
  initialDate?: Date;
  platforms?: Platform[];
  statuses?: PostStatus['status'][];
  view?: 'day' | 'week' | 'month';
  showWeekends?: boolean;
}

export function useContentCalendar({
  initialDate = new Date(),
  platforms = [],
  statuses = ['scheduled', 'published'],
  view = 'week',
  showWeekends = true,
}: UseContentCalendarProps = {}) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate date range based on view
  const { startDate, endDate } = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          startDate: new Date(currentDate),
          endDate: new Date(currentDate),
        };
      case 'week':
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 }), // Sunday
        };
      case 'month':
      default:
        // For month view, we'll show 4 weeks at a time
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          startDate: start,
          endDate: addDays(start, 27), // 4 weeks
        };
    }
  }, [currentDate, view]);

  // Fetch posts for the current date range
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, you would fetch posts from your API
      // const response = await api.getPosts({
      //   startDate,
      //   endDate,
      //   platforms,
      //   statuses,
      // });
      // setPosts(response.data);
      
      // Mock data for now
      setPosts([]);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, platforms, statuses]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Generate calendar days
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return days.map(date => {
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const today = new Date();
      const isToday = isSameDay(date, today);
      
      // Filter posts for this day
      const dayPosts = posts.filter(post => {
        if (!post.status.scheduledFor) return false;
        const postDate = new Date(post.status.scheduledFor);
        return isSameDay(postDate, date);
      });

      return {
        date,
        isCurrentMonth,
        isToday,
        formattedDate: format(date, 'd'),
        posts: dayPosts,
      };
    });
  }, [startDate, endDate, currentDate, posts]);

  // Navigation functions
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (view) {
        case 'day':
          return addDays(prevDate, -1);
        case 'week':
          return addDays(prevDate, -7);
        case 'month':
        default:
          return addWeeks(prevDate, -1);
      }
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (view) {
        case 'day':
          return addDays(prevDate, 1);
        case 'week':
          return addDays(prevDate, 7);
        case 'month':
        default:
          return addWeeks(prevDate, 1);
      }
    });
  }, [view]);

  // Filter out weekends if needed
  const filteredCalendarDays = useMemo(() => {
    if (showWeekends) return calendarDays;
    
    return calendarDays.filter(day => {
      const dayOfWeek = day.date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
    });
  }, [calendarDays, showWeekends]);

  return {
    // State
    currentDate,
    calendarDays: filteredCalendarDays,
    startDate,
    endDate,
    isLoading,
    error,
    
    // Navigation
    goToToday,
    goToPrevious,
    goToNext,
    setCurrentDate,
    
    // View controls
    view,
    setView: (newView: 'day' | 'week' | 'month') => {
      // Update view logic if needed
      console.log('View changed to:', newView);
    },
    
    // Refresh
    refresh: fetchPosts,
  };
}

// Helper hook for drag and drop functionality
export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<Date | null>(null);

  const handleDragStart = useCallback((item: any) => {
    setDraggedItem(item);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDropTarget(date);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, onDrop: (item: any, date: Date) => void) => {
    e.preventDefault();
    if (draggedItem && dropTarget) {
      onDrop(draggedItem, dropTarget);
    }
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, dropTarget]);

  return {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}
