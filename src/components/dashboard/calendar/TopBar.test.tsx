import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from './TopBar';

describe('TopBar', () => {
  const defaultDate = new Date(2025, 6, 7); // July 7, 2025
  const formatDate = (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  it('renders navigation controls and current date', () => {
    render(<TopBar currentDate={defaultDate} viewMode="week" />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous')).toBeInTheDocument();
    expect(screen.getByLabelText('Next')).toBeInTheDocument();
    expect(screen.getByText(formatDate(defaultDate))).toBeInTheDocument();
  });

  it('renders view switcher buttons and highlights the active view', () => {
    render(<TopBar currentDate={defaultDate} viewMode="month" />);
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month' })).toHaveClass('bg-violet-600');
  });

  it('calls onToday, onPrev, and onNext handlers when navigation buttons are clicked', () => {
    const onToday = jest.fn();
    const onPrev = jest.fn();
    const onNext = jest.fn();
    render(
      <TopBar
        currentDate={defaultDate}
        viewMode="week"
        onToday={onToday}
        onPrev={onPrev}
        onNext={onNext}
      />
    );
    fireEvent.click(screen.getByText('Today'));
    expect(onToday).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Previous'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next'));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onViewChange with correct view when view switcher buttons are clicked', () => {
    const onViewChange = jest.fn();
    render(
      <TopBar
        currentDate={defaultDate}
        viewMode="week"
        onViewChange={onViewChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    expect(onViewChange).toHaveBeenCalledWith('day');
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(onViewChange).toHaveBeenCalledWith('month');
  });
}); 