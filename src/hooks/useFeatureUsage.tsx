'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';

interface FeatureUsage {
  [featureName: string]: number;
}

interface DismissedPopups {
  [key: string]: boolean;
}

export function useFeatureUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<FeatureUsage>({});
  const [dismissedPopups, setDismissedPopups] = useState<DismissedPopups>({});
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string>('');

  // Load usage from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedUsage = localStorage.getItem(`feature_usage_${user.id}`);
      if (savedUsage) {
        setUsage(JSON.parse(savedUsage));
      }
      
      const savedDismissed = localStorage.getItem(`dismissed_popups_${user.id}`);
      if (savedDismissed) {
        setDismissedPopups(JSON.parse(savedDismissed));
      }
    } else {
      // For non-authenticated users, use session storage
      const savedDismissed = sessionStorage.getItem('dismissed_popups_guest');
      if (savedDismissed) {
        setDismissedPopups(JSON.parse(savedDismissed));
      }
    }
  }, [user]);

  // Save usage to localStorage whenever it changes
  useEffect(() => {
    if (user && Object.keys(usage).length > 0) {
      localStorage.setItem(`feature_usage_${user.id}`, JSON.stringify(usage));
    }
  }, [user, usage]);

  // Save dismissed popups
  useEffect(() => {
    if (user) {
      localStorage.setItem(`dismissed_popups_${user.id}`, JSON.stringify(dismissedPopups));
    } else {
      sessionStorage.setItem('dismissed_popups_guest', JSON.stringify(dismissedPopups));
    }
  }, [user, dismissedPopups]);

  const checkFeatureAccess = (featureName: string): boolean => {
    // If user is not logged in and hasn't dismissed login popup, show login prompt
    if (!user) {
      const dismissKey = `login_${featureName}`;
      if (!dismissedPopups[dismissKey]) {
        setCurrentFeature(featureName);
        setShowLoginPrompt(true);
        return false;
      }
      return false; // Still can't access without login
    }

    // Check if user has used this feature before
    const currentUsage = usage[featureName] || 0;
    
    // Allow one free use for new users
    if (currentUsage === 0) {
      return true;
    }

    // If they've used it once and haven't dismissed subscription popup, show subscription prompt
    const dismissKey = `subscription_${featureName}`;
    if (!dismissedPopups[dismissKey]) {
      setCurrentFeature(featureName);
      setShowSubscriptionPrompt(true);
      return false;
    }
    
    return false; // Still can't access without subscription
  };

  const recordFeatureUsage = (featureName: string) => {
    if (!user) return;
    
    setUsage(prev => ({
      ...prev,
      [featureName]: (prev[featureName] || 0) + 1
    }));
  };

  const getUsageCount = (featureName: string): number => {
    return usage[featureName] || 0;
  };

  const hasUsedFeature = (featureName: string): boolean => {
    return (usage[featureName] || 0) > 0;
  };

  const closeLoginPrompt = () => {
    setShowLoginPrompt(false);
    if (currentFeature) {
      const dismissKey = `login_${currentFeature}`;
      setDismissedPopups(prev => ({
        ...prev,
        [dismissKey]: true
      }));
    }
    setCurrentFeature('');
  };

  const closeSubscriptionPrompt = () => {
    setShowSubscriptionPrompt(false);
    if (currentFeature) {
      const dismissKey = `subscription_${currentFeature}`;
      setDismissedPopups(prev => ({
        ...prev,
        [dismissKey]: true
      }));
    }
    setCurrentFeature('');
  };

  return {
    checkFeatureAccess,
    recordFeatureUsage,
    getUsageCount,
    hasUsedFeature,
    showLoginPrompt,
    showSubscriptionPrompt,
    currentFeature,
    closeLoginPrompt,
    closeSubscriptionPrompt,
    isAuthenticated: !!user
  };
} 