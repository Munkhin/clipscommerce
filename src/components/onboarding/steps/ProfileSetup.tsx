'use client';

import React, { useState } from 'react';
import { OnboardingStep, OnboardingProgress, UserProfile } from '@/lib/onboarding/onboardingManager';
import { User, Building, Target, Star, ArrowRight } from 'lucide-react';

interface ProfileSetupProps {
  step: OnboardingStep;
  progress: OnboardingProgress;
  onComplete: (data: any) => void;
  onSkip?: () => void;
  onPrevious?: () => void;
}

export function ProfileSetup({ step, progress, onComplete, onPrevious }: ProfileSetupProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    role: progress.userProfile.role || 'member',
    companySize: progress.userProfile.companySize || 'startup',
    primaryGoal: progress.userProfile.primaryGoal || 'growth',
    experience: progress.userProfile.experience || 'beginner',
    industry: progress.userProfile.industry || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roles = [
    { value: 'admin', label: 'Admin/Owner', description: 'Full access to all features and settings' },
    { value: 'manager', label: 'Manager', description: 'Manage team members and content strategy' },
    { value: 'member', label: 'Team Member', description: 'Create and manage content' }
  ];

  const companySizes = [
    { value: 'startup', label: 'Startup', description: '1-10 employees' },
    { value: 'small', label: 'Small Business', description: '11-50 employees' },
    { value: 'medium', label: 'Medium Business', description: '51-200 employees' },
    { value: 'enterprise', label: 'Enterprise', description: '200+ employees' }
  ];

  const primaryGoals = [
    { value: 'growth', label: 'Growth', description: 'Increase followers and reach', icon: '📈' },
    { value: 'efficiency', label: 'Efficiency', description: 'Streamline content creation', icon: '⚡' },
    { value: 'analytics', label: 'Analytics', description: 'Better performance insights', icon: '📊' },
    { value: 'collaboration', label: 'Collaboration', description: 'Improve team workflows', icon: '🤝' }
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner', description: 'New to social media marketing' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience with content creation' },
    { value: 'advanced', label: 'Advanced', description: 'Experienced marketer or creator' }
  ];

  const industries = [
    'E-commerce', 'SaaS/Technology', 'Healthcare', 'Education', 'Finance',
    'Real Estate', 'Food & Beverage', 'Fashion', 'Fitness', 'Travel',
    'Entertainment', 'Non-profit', 'Consulting', 'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.companySize) newErrors.companySize = 'Company size is required';
    if (!formData.primaryGoal) newErrors.primaryGoal = 'Primary goal is required';
    if (!formData.experience) newErrors.experience = 'Experience level is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onComplete(formData);
    }
  };

  const updateFormData = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{step.title}</h1>
        <p className="text-lg text-gray-600">{step.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            What's your role? *
          </label>
          <div className="grid gap-4">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  formData.role === role.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${errors.role ? 'border-red-300' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={formData.role === role.value}
                  onChange={(e) => updateFormData('role', e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-500">{role.description}</div>
                </div>
                {formData.role === role.value && (
                  <div className="text-blue-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.role && <p className="mt-2 text-sm text-red-600">{errors.role}</p>}
        </div>

        {/* Company Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Building className="inline h-4 w-4 mr-2" />
            What's your company size? *
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            {companySizes.map((size) => (
              <label
                key={size.value}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  formData.companySize === size.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${errors.companySize ? 'border-red-300' : ''}`}
              >
                <input
                  type="radio"
                  name="companySize"
                  value={size.value}
                  checked={formData.companySize === size.value}
                  onChange={(e) => updateFormData('companySize', e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{size.label}</div>
                  <div className="text-sm text-gray-500">{size.description}</div>
                </div>
                {formData.companySize === size.value && (
                  <div className="text-blue-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.companySize && <p className="mt-2 text-sm text-red-600">{errors.companySize}</p>}
        </div>

        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Target className="inline h-4 w-4 mr-2" />
            What's your primary goal? *
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            {primaryGoals.map((goal) => (
              <label
                key={goal.value}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  formData.primaryGoal === goal.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${errors.primaryGoal ? 'border-red-300' : ''}`}
              >
                <input
                  type="radio"
                  name="primaryGoal"
                  value={goal.value}
                  checked={formData.primaryGoal === goal.value}
                  onChange={(e) => updateFormData('primaryGoal', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center flex-1">
                  <span className="text-2xl mr-3">{goal.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{goal.label}</div>
                    <div className="text-sm text-gray-500">{goal.description}</div>
                  </div>
                </div>
                {formData.primaryGoal === goal.value && (
                  <div className="text-blue-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.primaryGoal && <p className="mt-2 text-sm text-red-600">{errors.primaryGoal}</p>}
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Star className="inline h-4 w-4 mr-2" />
            What's your experience level? *
          </label>
          <div className="grid gap-4">
            {experienceLevels.map((level) => (
              <label
                key={level.value}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  formData.experience === level.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${errors.experience ? 'border-red-300' : ''}`}
              >
                <input
                  type="radio"
                  name="experience"
                  value={level.value}
                  checked={formData.experience === level.value}
                  onChange={(e) => updateFormData('experience', e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{level.label}</div>
                  <div className="text-sm text-gray-500">{level.description}</div>
                </div>
                {formData.experience === level.value && (
                  <div className="text-blue-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.experience && <p className="mt-2 text-sm text-red-600">{errors.experience}</p>}
        </div>

        {/* Industry (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Industry (Optional)
          </label>
          <select
            value={formData.industry || ''}
            onChange={(e) => updateFormData('industry', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select your industry</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-6">
          {onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Previous
            </button>
          )}
          
          <button
            type="submit"
            className="ml-auto inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span>Continue</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
} 