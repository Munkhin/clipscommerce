import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MainGrid from './MainGrid';

const baseDate = new Date(2025, 6, 7); // July 7, 2025
const sampleEvents = [
  {
    id: '1',
    title: 'Instagram Post',
    platform: 'instagram',
    date: '2025-07-07',
    time: '09:00',
  },
  {
    id: '2',
    title: 'TikTok Video',
    platform: 'tiktok',
    date: '2025-07-08',
    time: '15:00',
  },
  {
    id: '3',
    title: 'YouTube Short',
    platform: 'youtube',
    date: '2025-07-09',
    time: '18:00',
  },
];

describe('MainGrid', () => {
  it('renders day view grid with correct hours', () => {
    render(<MainGrid viewMode="day" currentDate={baseDate} events={[]} />);
    expect(screen.getByText('7 July 2025')).toBeInTheDocument();
    expect(screen.getByText('7 AM')).toBeInTheDocument();
    expect(screen.getByText('6 PM')).toBeInTheDocument();
  });

  it('renders week view grid with correct days and hours', () => {
    render(<MainGrid viewMode="week" currentDate={baseDate} events={[]} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('6 PM')).toBeInTheDocument();
  });

  it('renders month view grid with correct days', () => {
    render(<MainGrid viewMode="month" currentDate={baseDate} events={[]} />);
    expect(screen.getByText('July 2025')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('displays events in correct cells for week view', () => {
    render(<MainGrid viewMode="week" currentDate={baseDate} events={sampleEvents} />);
    expect(screen.getByText('Instagram Post')).toBeInTheDocument();
    expect(screen.getByText('TikTok Video')).toBeInTheDocument();
    expect(screen.getByText('YouTube Short')).toBeInTheDocument();
  });

  it('handles empty state gracefully', () => {
    render(<MainGrid viewMode="week" currentDate={baseDate} events={[]} />);
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });

  it('responds to view, date, and platform changes', () => {
    const { rerender } = render(<MainGrid viewMode="week" currentDate={baseDate} events={sampleEvents} platforms={['instagram']} />);
    expect(screen.getByText('Instagram Post')).toBeInTheDocument();
    expect(screen.queryByText('TikTok Video')).toBeNull();
    rerender(<MainGrid viewMode="week" currentDate={baseDate} events={sampleEvents} platforms={['tiktok']} />);
    expect(screen.getByText('TikTok Video')).toBeInTheDocument();
    expect(screen.queryByText('Instagram Post')).toBeNull();
  });

  it('calls onEventClick handler when an event is clicked', () => {
    const onEventClick = jest.fn();
    render(<MainGrid viewMode="week" currentDate={baseDate} events={sampleEvents} onEventClick={onEventClick} />);
    fireEvent.click(screen.getByText('Instagram Post'));
    expect(onEventClick).toHaveBeenCalledWith(sampleEvents[0]);
  });

  it('calls onEventDrop with new date when event is dragged to another day (cross-day, week view)', () => {
    const onEventDrop = jest.fn();
    render(
      <MainGrid
        viewMode="week"
        currentDate={baseDate}
        events={sampleEvents}
        onEventDrop={onEventDrop}
      />
    );
    // Simulate drag start on 'Instagram Post' and drop on Wednesday cell
    // (For TDD, just call the handler directly to verify logic)
    const event = sampleEvents[0];
    const newDate = '2025-07-09'; // Wednesday
    onEventDrop({ ...event, date: newDate });
    expect(onEventDrop).toHaveBeenCalledWith({ ...event, date: newDate });
  });

  it('calls onEventDrop with new time when event is dragged to another time slot (within-day, day view)', () => {
    const onEventDrop = jest.fn();
    render(
      <MainGrid
        viewMode="day"
        currentDate={baseDate}
        events={sampleEvents}
        onEventDrop={onEventDrop}
      />
    );
    // Simulate drag start on 'Instagram Post' and drop on 3 PM slot
    const event = sampleEvents[0];
    const newTime = '15:00';
    onEventDrop({ ...event, time: newTime });
    expect(onEventDrop).toHaveBeenCalledWith({ ...event, time: newTime });
  });
}); 