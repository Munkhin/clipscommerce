'use client';

import React from 'react';
import { OnboardingStep, OnboardingProgress } from '@/lib/onboarding/onboardingManager';
import { Rocket, Zap, Users, BarChart3, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  step: OnboardingStep;
  progress: OnboardingProgress;
  onComplete: (data?: any) => void;
  onSkip?: () => void;
  onPrevious?: () => void;
}

export function WelcomeScreen({ step, progress, onComplete }: WelcomeScreenProps) {
  const features = [
    {
      icon: Zap,
      title: 'Viral Content AI',
      description: 'Generate viral-ready content with our advanced AI framework'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with role-based access and workflows'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Track performance and optimize your content strategy'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6">
          <Rocket className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ClipsCommerce! 🚀
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Let's get you set up for viral content success. This quick setup will personalize your experience 
          and help you start creating engaging content that drives results.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-center space-x-2 text-blue-700">
            <span className="font-medium">Estimated time:</span>
            <span className="font-bold">25-30 minutes</span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4 border border-gray-100">
              <feature.icon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* What You'll Set Up */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          What we'll set up together
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Your Profile</h3>
                <p className="text-gray-600 text-sm">Tell us about your role and goals</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Team Setup</h3>
                <p className="text-gray-600 text-sm">Invite team members and assign roles</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Product Tour</h3>
                <p className="text-gray-600 text-sm">Explore key features and capabilities</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">First Client</h3>
                <p className="text-gray-600 text-sm">Connect your social media accounts</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">5</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Content Generation</h3>
                <p className="text-gray-600 text-sm">Create your first viral content</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-sm font-bold">6</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics Setup</h3>
                <p className="text-gray-600 text-sm">Configure performance tracking</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-green-600 text-sm font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">You're Ready!</h3>
                <p className="text-gray-600 text-sm">Start creating viral content</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          Why complete the setup?
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Faster Results</h3>
            <p className="text-sm text-gray-600">Personalized experience gets you to viral content faster</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-1">Better Targeting</h3>
            <p className="text-sm text-gray-600">AI learns your preferences for more relevant suggestions</p>
          </div>
          <div>
            <div className="text-3xl mb-2">📈</div>
            <h3 className="font-semibold text-gray-900 mb-1">Higher Engagement</h3>
            <p className="text-sm text-gray-600">Optimized workflows lead to better content performance</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={() => onComplete()}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <span>Let's Get Started</span>
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
        
        <p className="mt-4 text-sm text-gray-500">
          You can skip any optional steps and come back to them later
        </p>
      </div>
    </div>
  );
} 