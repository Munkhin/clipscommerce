import { useState, useEffect } from 'react';
import { ClientReport, EmailTemplate, AutomationRule } from './types';

export function useFeedbackData() {
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize sample reports data
        const sampleReports: ClientReport[] = Array.from({ length: 25 }, (_, i) => {
          const clientNames = ['TechCorp Inc.', 'Lifestyle Brand Co.', 'Fitness Pro', 'Travel Adventures', 'Food & Wine Co.'];
          const clientName = clientNames[i % clientNames.length];
          const reportTypes = ['weekly', 'monthly', 'quarterly'] as const;
          const reportType = reportTypes[i % reportTypes.length];
          const tones = ['professional', 'casual', 'enthusiastic', 'analytical'] as const;
          const tone = tones[i % tones.length];

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - (i * 7 + 30));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);

          return {
            id: `report-${i + 1}`,
            clientId: `client-${(i % 5) + 1}`,
            clientName,
            reportType,
            period: { start: startDate, end: endDate },
            metrics: {
              totalViews: Math.floor(Math.random() * 1000000) + 10000,
              totalEngagement: Math.floor(Math.random() * 50000) + 1000,
              avgEngagementRate: Math.random() * 10 + 2,
              topPerformingVideo: `Video ${Math.floor(Math.random() * 100) + 1}`,
              growthRate: (Math.random() - 0.5) * 50,
              platformBreakdown: [
                { platform: 'TikTok', views: Math.floor(Math.random() * 500000), engagement: Math.floor(Math.random() * 25000) },
                { platform: 'Instagram', views: Math.floor(Math.random() * 300000), engagement: Math.floor(Math.random() * 15000) },
                { platform: 'YouTube', views: Math.floor(Math.random() * 200000), engagement: Math.floor(Math.random() * 10000) }
              ]
            },
            insights: [
              'Peak engagement occurs between 6-8 PM on weekdays',
              'Short-form content outperforms long-form by 35%',
              'User-generated content shows 40% higher engagement'
            ],
            recommendations: [
              'Increase posting frequency during peak hours',
              'Focus on short-form video content',
              'Implement user-generated content campaigns'
            ],
            status: ['generating', 'ready', 'sent', 'failed'][Math.floor(Math.random() * 4)] as any,
            tone,
            customizations: {
              includeComparisons: Math.random() > 0.5,
              includeRecommendations: Math.random() > 0.3,
              includeProjections: Math.random() > 0.4,
              brandColors: ['#3B82F6', '#EF4444', '#10B981']
            },
            generatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            sentAt: Math.random() > 0.6 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : undefined
          };
        });

        // Initialize sample email templates
        const sampleTemplates: EmailTemplate[] = [
          {
            id: 'template-1',
            name: 'Weekly Performance Update',
            subject: 'Weekly Performance Report - {{clientName}}',
            content: 'Dear {{clientName}}, here are your weekly performance metrics...',
            tone: 'professional',
            variables: ['clientName', 'totalViews', 'engagementRate'],
            clientTypes: ['enterprise', 'agency']
          },
          {
            id: 'template-2',
            name: 'Casual Monthly Recap',
            subject: 'Your Amazing Month in Numbers! 🚀',
            content: 'Hey {{clientName}}! What a month you\'ve had...',
            tone: 'casual',
            variables: ['clientName', 'topVideo', 'growthRate'],
            clientTypes: ['creator', 'small-business']
          }
        ];

        // Initialize sample automation rules
        const sampleRules: AutomationRule[] = [
          {
            id: 'rule-1',
            name: 'Weekly Auto-Report',
            trigger: 'weekly',
            conditions: [],
            actions: {
              generateReport: true,
              sendEmail: true,
              notifyTeam: false,
              scheduleFollowup: false
            },
            clientFilter: ['all'],
            isActive: true
          }
        ];

        setReports(sampleReports);
        setEmailTemplates(sampleTemplates);
        setAutomationRules(sampleRules);
      } catch (error) {
        console.error('Error initializing feedback data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  return {
    reports,
    setReports,
    emailTemplates,
    setEmailTemplates,
    automationRules,
    setAutomationRules,
    isLoading
  };
}