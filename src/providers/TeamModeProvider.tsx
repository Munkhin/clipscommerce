'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Client {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'paused' | 'needs_attention';
  workflowStatus: 'idle' | 'running' | 'completed' | 'error';
  avgEngagement: number;
  engagementTrend: 'up' | 'down' | 'neutral';
  totalPosts: number;
  revenue: number;
  revenueTrend: 'up' | 'down' | 'neutral';
  logo?: string;
  lastActive: Date;
  connectedPlatforms: string[];
  customTags: string[];
}

interface TeamModeContextType {
  // Client management
  clients: Client[];
  totalClientCount: number;
  selectedClients: string[];
  
  // Data loading
  isLoading: boolean;
  loadMoreClients: (startIndex: number, stopIndex: number) => Promise<void>;
  isClientLoaded: (index: number) => boolean;
  refreshClients: () => Promise<void>;
  
  // Search and filtering
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  
  // Selection and bulk operations
  toggleClientSelection: (clientId: string) => void;
  selectAllClients: () => void;
  clearSelection: () => void;
  
  // Current view state
  currentTab: 'operations' | 'analytics' | 'settings';
  setCurrentTab: (tab: 'operations' | 'analytics' | 'settings') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

const TeamModeContext = createContext<TeamModeContextType | undefined>(undefined);

export function TeamModeProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalClientCount, setTotalClientCount] = useState(0);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [currentTab, setCurrentTab] = useState<'operations' | 'analytics' | 'settings'>('operations');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [clientCache, setClientCache] = useState<Record<number, Client>>({});

  // Initialize with mock data
  useEffect(() => {
    // TODO: Replace with actual API call to fetch initial client data.
    // initializeMockData(); // Remove this call once API integration is complete.
  }, []);

  // TODO: Remove this mock data generation function once real API data is available.
  const initializeMockData = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set total count (simulating millions of clients)
    // setTotalClientCount(1_247_832);
    
    // Load initial batch
    // await loadMoreClients(0, 49);
    
    setIsLoading(false);
  };

  // TODO: Remove this mock client generation function once real API data is available.
  const generateMockClient = (index: number): Client => {
    const industries = ['Technology', 'Fashion', 'Food & Beverage', 'Fitness', 'Beauty', 'Travel', 'Education', 'Finance'];
    const statuses: Client['status'][] = ['active', 'paused', 'needs_attention'];
    const workflowStatuses: Client['workflowStatus'][] = ['idle', 'running', 'completed', 'error'];
    const trends: Client['engagementTrend'][] = ['up', 'down', 'neutral'];
    const platforms = ['TikTok', 'Instagram', 'YouTube', 'Twitter', 'LinkedIn'];
    
    const name = `Client ${index + 1}`;
    const industry = industries[index % industries.length];
    
    return {
      id: `client-${index}`,
      name,
      industry,
      status: statuses[index % statuses.length],
      workflowStatus: workflowStatuses[index % workflowStatuses.length],
      avgEngagement: Math.round((Math.random() * 10 + 1) * 10) / 10,
      engagementTrend: trends[index % trends.length],
      totalPosts: Math.floor(Math.random() * 200) + 10,
      revenue: Math.floor(Math.random() * 50000) + 1000,
      revenueTrend: trends[index % trends.length],
      lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      connectedPlatforms: platforms.slice(0, Math.floor(Math.random() * 3) + 1),
      customTags: [`tag-${index % 5}`, `category-${index % 3}`]
    };
  };

  const loadMoreClients = async (startIndex: number, stopIndex: number): Promise<void> => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newClients: Client[] = [];
    const newCache: Record<number, Client> = { ...clientCache };
    
    for (let i = startIndex; i <= stopIndex; i++) {
      if (!newCache[i]) {
        // TODO: Replace with actual client data fetched from the backend.
        const client = generateMockClient(i);
        newClients.push(client);
        newCache[i] = client;
      }
    }
    
    if (newClients.length > 0) {
      setClients(prev => [...prev, ...newClients]);
      setClientCache(newCache);
    }
    
    setIsLoading(false);
  };

  const isClientLoaded = (index: number): boolean => {
    return !!clientCache[index];
  };

  const refreshClients = async (): Promise<void> => {
    setClients([]);
    setClientCache({});
    // TODO: Call the actual API to refresh clients.
    // await loadMoreClients(0, 49); // This should be replaced by a real API call
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    const visibleClientIds = clients.map(client => client.id);
    setSelectedClients(visibleClientIds);
  };

  const clearSelection = () => {
    setSelectedClients([]);
  };

  const bulkUpdateStatus = (clientIds: string[], status: Client['status']) => {
    setClients(prev => prev.map(client => 
      clientIds.includes(client.id) 
        ? { ...client, status }
        : client
    ));
  };

  const bulkAddTags = (clientIds: string[], tags: string[]) => {
    setClients(prev => prev.map(client => 
      clientIds.includes(client.id)
        ? { ...client, customTags: [...client.customTags, ...tags] }
        : client
    ));
  };

  const value: TeamModeContextType = {
    clients,
    totalClientCount,
    selectedClients,
    isLoading,
    loadMoreClients,
    isClientLoaded,
    refreshClients,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    toggleClientSelection,
    selectAllClients,
    clearSelection,
    currentTab,
    setCurrentTab,
    viewMode,
    setViewMode,
  };

  return (
    <TeamModeContext.Provider value={value}>
      {children}
    </TeamModeContext.Provider>
  );
}

export function useTeamMode() {
  const context = useContext(TeamModeContext);
  if (context === undefined) {
    throw new Error('useTeamMode must be used within a TeamModeProvider');
  }
  return context;
} 