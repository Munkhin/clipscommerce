import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders the mini calendar (month label and weekdays)', () => {
    render(<Sidebar />);
    // Check for a month label (e.g., 'July 2025')
    expect(screen.getByText(/\w+ \d{4}/)).toBeInTheDocument();
    // Check for weekday headers
    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Tu')).toBeInTheDocument();
    expect(screen.getByText('We')).toBeInTheDocument();
    expect(screen.getByText('Th')).toBeInTheDocument();
    expect(screen.getByText('Fr')).toBeInTheDocument();
    expect(screen.getByText('Sa')).toBeInTheDocument();
  });

  it('renders platform filters and create post button', () => {
    render(<Sidebar />);
    expect(screen.getByText('Platform Filters')).toBeInTheDocument();
    expect(screen.getByText('+ Create Post')).toBeInTheDocument();
  });

  it('calls onDateSelect when a date is selected', () => {
    const onDateSelect = jest.fn();
    render(<Sidebar onDateSelect={onDateSelect} />);
    // Find a day button with accessible name containing '15th'
    const dayButton = screen.getByRole('button', { name: /15th/ });
    fireEvent.click(dayButton);
    expect(onDateSelect).toHaveBeenCalled();
  });

  it('renders platform filter toggles for YouTube Shorts, TikTok, and Instagram', () => {
    render(<Sidebar />);
    expect(screen.getByLabelText('YouTube Shorts')).toBeInTheDocument();
    expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
  });

  it('calls onPlatformToggle with correct platform when toggles are clicked', () => {
    const onPlatformToggle = jest.fn();
    render(<Sidebar onPlatformToggle={onPlatformToggle} />);
    fireEvent.click(screen.getByLabelText('YouTube Shorts'));
    expect(onPlatformToggle).toHaveBeenCalledWith('youtube');
    fireEvent.click(screen.getByLabelText('TikTok'));
    expect(onPlatformToggle).toHaveBeenCalledWith('tiktok');
    fireEvent.click(screen.getByLabelText('Instagram'));
    expect(onPlatformToggle).toHaveBeenCalledWith('instagram');
  });

  it('calls onCreatePost when the Create Post button is clicked', () => {
    const onCreatePost = jest.fn();
    render(<Sidebar onCreatePost={onCreatePost} />);
    const button = screen.getByRole('button', { name: '+ Create Post' });
    fireEvent.click(button);
    expect(onCreatePost).toHaveBeenCalled();
  });
}); 