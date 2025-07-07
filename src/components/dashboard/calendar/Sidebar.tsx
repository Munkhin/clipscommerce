import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface SidebarProps {
  onDateSelect?: (date: Date) => void;
  onPlatformToggle?: (platform: string) => void;
  onCreatePost?: () => void;
}

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube Shorts' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
];

export default function Sidebar({ onDateSelect, onPlatformToggle, onCreatePost }: SidebarProps) {
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [activePlatforms, setActivePlatforms] = useState<string[]>(PLATFORMS.map(p => p.key));

  const handleSelect = (date?: Date) => {
    setSelected(date);
    if (date && onDateSelect) onDateSelect(date);
  };

  const handlePlatformToggle = (platform: string) => {
    setActivePlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    if (onPlatformToggle) onPlatformToggle(platform);
  };

  const handleCreatePost = () => {
    if (onCreatePost) onCreatePost();
  };

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col p-4 min-h-screen">
      {/* Mini Calendar */}
      <div className="mb-6">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          className="bg-gray-800 rounded-lg p-2 text-white"
        />
      </div>
      {/* Platform Filters */}
      <div className="mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-gray-400">
          <div className="mb-2 font-semibold text-white">Platform Filters</div>
          <div className="flex flex-col gap-2">
            {PLATFORMS.map(platform => (
              <label key={platform.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={platform.label}
                  checked={activePlatforms.includes(platform.key)}
                  onChange={() => handlePlatformToggle(platform.key)}
                  className="accent-violet-600"
                />
                <span>{platform.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      {/* Create Post Button */}
      <button
        className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition"
        aria-label="+ Create Post"
        onClick={handleCreatePost}
      >
        + Create Post
      </button>
    </aside>
  );
} 