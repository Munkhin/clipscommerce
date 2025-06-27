'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  // Notification settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  contentAnalytics: boolean;
  
  // Appearance settings
  darkMode: boolean;
  colorTheme: string;
  
  // Preference settings
  timezone: string;
  language: string;
  scheduleFormat: string;
  
  // Privacy settings
  usageAnalytics: boolean;
  marketingCommunications: boolean;
  
  // Update functions
  updateSettings: (settings: Partial<SettingsContextType>) => void;
  saveSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Initialize settings with defaults
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    contentAnalytics: true,
    darkMode: false,
    colorTheme: 'blue',
    timezone: 'UTC',
    language: 'en',
    scheduleFormat: '12h',
    usageAnalytics: true,
    marketingCommunications: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('clipscommerce-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Apply color theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.colorTheme);
  }, [settings.colorTheme]);

  const updateSettings = (newSettings: Partial<SettingsContextType>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('clipscommerce-settings', JSON.stringify(settings));
      // In a real app, also save to backend/Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const value: SettingsContextType = {
    ...settings,
    updateSettings,
    saveSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 