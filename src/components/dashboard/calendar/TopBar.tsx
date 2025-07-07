import React from 'react';

interface TopBarProps {
  currentDate: Date;
  viewMode: 'day' | 'week' | 'month';
  onToday?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onViewChange?: (view: 'day' | 'week' | 'month') => void;
}

const VIEW_MODES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function TopBar({
  currentDate,
  viewMode,
  onToday,
  onPrev,
  onNext,
  onViewChange,
}: TopBarProps) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="w-full bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 py-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 text-gray-300"
          onClick={onToday}
        >
          Today
        </button>
        <button
          aria-label="Previous"
          className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-gray-300"
          onClick={onPrev}
        >
          &lt;
        </button>
        <button
          aria-label="Next"
          className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-gray-300"
          onClick={onNext}
        >
          &gt;
        </button>
        <span className="ml-4 text-lg font-semibold text-white">{formatDate(currentDate)}</span>
      </div>
      {/* View Switcher */}
      <div className="flex items-center gap-2">
        {VIEW_MODES.map(({ key, label }) => (
          <button
            key={key}
            role="button"
            className={`px-3 py-1 rounded ${viewMode === key ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => onViewChange && onViewChange(key as 'day' | 'week' | 'month')}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
} 