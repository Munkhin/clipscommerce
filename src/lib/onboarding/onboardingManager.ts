export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  estimatedTime: number; // in minutes
  prerequisites?: string[];
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface OnboardingProgress {
  userId: string;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  userProfile: UserProfile;
  customData: Record<string, any>;
}

export interface UserProfile {
  role: 'admin' | 'manager' | 'member';
  companySize: 'startup' | 'small' | 'medium' | 'enterprise';
  primaryGoal: 'growth' | 'efficiency' | 'analytics' | 'collaboration';
  experience: 'beginner' | 'intermediate' | 'advanced';
  industry?: string;
}

export class OnboardingManager {
  private static instance: OnboardingManager;
  private steps: OnboardingStep[] = [];
  private progressCache = new Map<string, OnboardingProgress>();

  private constructor() {
    this.initializeSteps();
  }

  static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to ClipsCommerce',
        description: 'Get started with your viral content journey',
        component: 'WelcomeScreen',
        required: true,
        estimatedTime: 2
      },
      {
        id: 'profile-setup',
        title: 'Tell us about yourself',
        description: 'Help us personalize your experience',
        component: 'ProfileSetup',
        required: true,
        estimatedTime: 3,
        validationRules: [
          { type: 'required', message: 'Role is required' },
          { type: 'required', message: 'Company size is required' },
          { type: 'required', message: 'Primary goal is required' }
        ]
      },
      {
        id: 'team-setup',
        title: 'Set up your team',
        description: 'Invite team members and assign roles',
        component: 'TeamSetup',
        required: false,
        estimatedTime: 5,
        prerequisites: ['profile-setup']
      },
      {
        id: 'product-tour',
        title: 'Explore key features',
        description: 'Take a guided tour of the dashboard',
        component: 'ProductTour',
        required: true,
        estimatedTime: 8,
        prerequisites: ['profile-setup']
      },
      {
        id: 'first-client',
        title: 'Add your first client',
        description: 'Connect your social media accounts',
        component: 'FirstClient',
        required: true,
        estimatedTime: 5,
        prerequisites: ['product-tour'],
        validationRules: [
          { type: 'required', message: 'At least one client account is required' }
        ]
      },
      {
        id: 'content-generation',
        title: 'Generate your first content',
        description: 'Use our AI tools to create viral content',
        component: 'ContentGeneration',
        required: true,
        estimatedTime: 10,
        prerequisites: ['first-client']
      },
      {
        id: 'analytics-setup',
        title: 'Set up analytics tracking',
        description: 'Configure performance monitoring',
        component: 'AnalyticsSetup',
        required: false,
        estimatedTime: 7,
        prerequisites: ['content-generation']
      },
      {
        id: 'completion',
        title: 'You\'re all set!',
        description: 'Start creating viral content',
        component: 'CompletionScreen',
        required: true,
        estimatedTime: 2,
        prerequisites: ['content-generation']
      }
    ];
  }

  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    if (this.progressCache.has(userId)) {
      return this.progressCache.get(userId)!;
    }

    try {
      // In a real app, this would fetch from database
      const stored = localStorage.getItem(`onboarding_${userId}`);
      if (stored) {
        const progress = JSON.parse(stored);
        progress.startedAt = new Date(progress.startedAt);
        progress.lastActiveAt = new Date(progress.lastActiveAt);
        if (progress.completedAt) {
          progress.completedAt = new Date(progress.completedAt);
        }
        this.progressCache.set(userId, progress);
        return progress;
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    }

    return null;
  }

  async initializeProgress(userId: string, userProfile: Partial<UserProfile> = {}): Promise<OnboardingProgress> {
    const progress: OnboardingProgress = {
      userId,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: new Date(),
      lastActiveAt: new Date(),
      userProfile: {
        role: 'member',
        companySize: 'startup',
        primaryGoal: 'growth',
        experience: 'beginner',
        ...userProfile
      },
      customData: {}
    };

    await this.saveProgress(progress);
    return progress;
  }

  async updateProgress(userId: string, updates: Partial<OnboardingProgress>): Promise<OnboardingProgress> {
    const current = await this.getProgress(userId);
    if (!current) {
      throw new Error('Onboarding progress not found');
    }

    const updated = {
      ...current,
      ...updates,
      lastActiveAt: new Date()
    };

    await this.saveProgress(updated);
    return updated;
  }

  async completeStep(userId: string, stepId: string, data?: any): Promise<OnboardingProgress> {
    const progress = await this.getProgress(userId);
    if (!progress) {
      throw new Error('Onboarding progress not found');
    }

    const step = this.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    // Validate step completion
    if (step.validationRules && data) {
      const validation = this.validateStepData(step.validationRules, data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Check prerequisites
    if (step.prerequisites) {
      const missingPrereqs = step.prerequisites.filter(
        prereq => !progress.completedSteps.includes(prereq)
      );
      if (missingPrereqs.length > 0) {
        throw new Error(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
      }
    }

    const completedSteps = [...progress.completedSteps];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Store step data
    if (data) {
      progress.customData[stepId] = data;
    }

    // Check if onboarding is complete
    const requiredSteps = this.steps.filter(s => s.required).map(s => s.id);
    const isComplete = requiredSteps.every(id => completedSteps.includes(id));

    return this.updateProgress(userId, {
      completedSteps,
      currentStep: Math.min(progress.currentStep + 1, this.steps.length - 1),
      completedAt: isComplete ? new Date() : undefined,
      customData: progress.customData
    });
  }

  async skipStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getProgress(userId);
    if (!progress) {
      throw new Error('Onboarding progress not found');
    }

    const step = this.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    if (step.required) {
      throw new Error('Cannot skip required step');
    }

    const skippedSteps = [...progress.skippedSteps];
    if (!skippedSteps.includes(stepId)) {
      skippedSteps.push(stepId);
    }

    return this.updateProgress(userId, {
      skippedSteps,
      currentStep: Math.min(progress.currentStep + 1, this.steps.length - 1)
    });
  }

  private validateStepData(rules: ValidationRule[], data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!data || data === '' || data === null || data === undefined) {
            errors.push(rule.message);
          }
          break;
        case 'email':
          if (data && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
            errors.push(rule.message);
          }
          break;
        case 'minLength':
          if (data && data.length < rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(data)) {
            errors.push(rule.message);
          }
          break;
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private async saveProgress(progress: OnboardingProgress): Promise<void> {
    try {
      // Cache in memory
      this.progressCache.set(progress.userId, progress);
      
      // Persist to localStorage (in real app, would save to database)
      localStorage.setItem(`onboarding_${progress.userId}`, JSON.stringify(progress));
      
      // Track analytics
      this.trackOnboardingEvent('progress_updated', progress);
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      throw error;
    }
  }

  private trackOnboardingEvent(event: string, progress: OnboardingProgress): void {
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, {
        event_category: 'onboarding',
        event_label: progress.currentStep.toString(),
        custom_parameter_1: progress.userProfile.role,
        custom_parameter_2: progress.userProfile.primaryGoal
      });
    }
  }

  getSteps(): OnboardingStep[] {
    return [...this.steps];
  }

  getStep(stepId: string): OnboardingStep | undefined {
    return this.steps.find(s => s.id === stepId);
  }

  getCurrentStep(progress: OnboardingProgress): OnboardingStep | undefined {
    return this.steps[progress.currentStep];
  }

  getNextStep(progress: OnboardingProgress): OnboardingStep | undefined {
    const nextIndex = progress.currentStep + 1;
    return nextIndex < this.steps.length ? this.steps[nextIndex] : undefined;
  }

  getCompletionPercentage(progress: OnboardingProgress): number {
    const totalRequired = this.steps.filter(s => s.required).length;
    const completedRequired = progress.completedSteps.filter(stepId => {
      const step = this.steps.find(s => s.id === stepId);
      return step?.required;
    }).length;
    
    return Math.round((completedRequired / totalRequired) * 100);
  }

  getEstimatedTimeRemaining(progress: OnboardingProgress): number {
    const remainingSteps = this.steps.slice(progress.currentStep);
    return remainingSteps.reduce((total, step) => {
      if (!progress.completedSteps.includes(step.id) && !progress.skippedSteps.includes(step.id)) {
        return total + step.estimatedTime;
      }
      return total;
    }, 0);
  }

  async resetProgress(userId: string): Promise<void> {
    this.progressCache.delete(userId);
    localStorage.removeItem(`onboarding_${userId}`);
  }
} 