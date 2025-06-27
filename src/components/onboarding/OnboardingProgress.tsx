'use client';

import React from 'react';
import { OnboardingProgress as Progress, OnboardingStep } from '@/lib/onboarding/onboardingManager';
import { CheckCircle, Circle, Clock } from 'lucide-react';

interface OnboardingProgressProps {
  progress: Progress;
  steps: OnboardingStep[];
  completionPercentage: number;
}

export function OnboardingProgress({ progress, steps, completionPercentage }: OnboardingProgressProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className="text-sm text-gray-500">{completionPercentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = progress.completedSteps.includes(step.id);
            const isSkipped = progress.skippedSteps.includes(step.id);
            const isCurrent = index === progress.currentStep;
            const isAccessible = index <= progress.currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div className="relative">
                  {isCompleted ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : isSkipped ? (
                    <Circle className="h-8 w-8 text-gray-400" />
                  ) : isCurrent ? (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-white animate-pulse" />
                    </div>
                  ) : isAccessible ? (
                    <Circle className="h-8 w-8 text-blue-300" />
                  ) : (
                    <Circle className="h-8 w-8 text-gray-300" />
                  )}
                  
                  {/* Step Number */}
                  {!isCompleted && !isSkipped && (
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-2 text-center max-w-24">
                  <p className={`text-xs font-medium truncate ${
                    isCurrent ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    isSkipped ? 'text-gray-400' : 
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  {isCurrent && (
                    <div className="flex items-center justify-center mt-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{step.estimatedTime}m</span>
                    </div>
                  )}
                  {isSkipped && (
                    <span className="text-xs text-gray-400">Skipped</span>
                  )}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-green-500' : 
                        isCurrent ? 'bg-blue-500' : 
                        'bg-gray-200'
                      }`}
                      style={{ 
                        width: isCompleted ? '100%' : isCurrent ? '50%' : '0%' 
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Info */}
        {progress.currentStep < steps.length && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Current: {steps[progress.currentStep]?.title}
                </h3>
                <p className="text-sm text-blue-700">
                  {steps[progress.currentStep]?.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-600 font-medium">
                  {steps[progress.currentStep]?.estimatedTime} minutes
                </div>
                {steps[progress.currentStep]?.required && (
                  <div className="text-xs text-blue-500">Required</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 