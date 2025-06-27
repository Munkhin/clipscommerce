'use client';

import React, { useState, useEffect } from 'react';
import { OnboardingManager, OnboardingProgress, OnboardingStep } from '@/lib/onboarding/onboardingManager';
import { WelcomeScreen } from './steps/WelcomeScreen';
import { ProfileSetup } from './steps/ProfileSetup';
import { TeamSetup } from './steps/TeamSetup';
import { ProductTour } from './steps/ProductTour';
import { FirstClient } from './steps/FirstClient';
import { ContentGeneration } from './steps/ContentGeneration';
import { AnalyticsSetup } from './steps/AnalyticsSetup';
import { CompletionScreen } from './steps/CompletionScreen';
import { OnboardingProgress as ProgressComponent } from './OnboardingProgress';
import { CheckCircle, Clock, ArrowRight, ArrowLeft, X } from 'lucide-react';

interface OnboardingFlowProps {
  userId: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

const stepComponents = {
  WelcomeScreen,
  ProfileSetup,
  TeamSetup,
  ProductTour,
  FirstClient,
  ContentGeneration,
  AnalyticsSetup,
  CompletionScreen
};

export function OnboardingFlow({ userId, onComplete, onSkip }: OnboardingFlowProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const onboardingManager = OnboardingManager.getInstance();

  useEffect(() => {
    initializeOnboarding();
  }, [userId]);

  const initializeOnboarding = async () => {
    try {
      setLoading(true);
      let userProgress = await onboardingManager.getProgress(userId);
      
      if (!userProgress) {
        userProgress = await onboardingManager.initializeProgress(userId);
      }

      setProgress(userProgress);
      const step = onboardingManager.getCurrentStep(userProgress);
      setCurrentStep(step || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: string, data?: any) => {
    if (!progress) return;

    try {
      setIsTransitioning(true);
      const updatedProgress = await onboardingManager.completeStep(userId, stepId, data);
      setProgress(updatedProgress);

      // Check if onboarding is complete
      if (updatedProgress.completedAt) {
        onComplete?.();
        return;
      }

      // Move to next step
      const nextStep = onboardingManager.getCurrentStep(updatedProgress);
      setCurrentStep(nextStep || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete step');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStepSkip = async (stepId: string) => {
    if (!progress) return;

    try {
      setIsTransitioning(true);
      const updatedProgress = await onboardingManager.skipStep(userId, stepId);
      setProgress(updatedProgress);

      const nextStep = onboardingManager.getCurrentStep(updatedProgress);
      setCurrentStep(nextStep || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip step');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handlePrevious = async () => {
    if (!progress || progress.currentStep <= 0) return;

    try {
      setIsTransitioning(true);
      const updatedProgress = await onboardingManager.updateProgress(userId, {
        currentStep: progress.currentStep - 1
      });
      setProgress(updatedProgress);

      const step = onboardingManager.getCurrentStep(updatedProgress);
      setCurrentStep(step || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go to previous step');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleExit = () => {
    onSkip?.();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your onboarding experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Onboarding Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={initializeOnboarding}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progress || !currentStep) {
    return null;
  }

  const StepComponent = stepComponents[currentStep.component as keyof typeof stepComponents];
  const completionPercentage = onboardingManager.getCompletionPercentage(progress);
  const estimatedTime = onboardingManager.getEstimatedTimeRemaining(progress);
  const steps = onboardingManager.getSteps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">ClipsCommerce Setup</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{estimatedTime} min remaining</span>
              </div>
            </div>
            <button
              onClick={handleExit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Exit onboarding"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressComponent
        progress={progress}
        steps={steps}
        completionPercentage={completionPercentage}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
          <StepComponent
            step={currentStep}
            progress={progress}
            onComplete={(data) => handleStepComplete(currentStep.id, data)}
            onSkip={currentStep.required ? undefined : () => handleStepSkip(currentStep.id)}
            onPrevious={progress.currentStep > 0 ? handlePrevious : undefined}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Step {progress.currentStep + 1} of {steps.length}
              </span>
              <div className="flex items-center space-x-1">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      index < progress.currentStep
                        ? 'bg-green-500'
                        : index === progress.currentStep
                        ? 'bg-blue-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {progress.currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isTransitioning}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              )}

              <div className="text-sm text-gray-500">
                {completionPercentage}% complete
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 