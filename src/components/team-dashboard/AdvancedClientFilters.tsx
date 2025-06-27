'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Activity,
  MapPin,
  Tag,
  TrendingUp,
  Zap,
  RefreshCw,
  Save,
  Bookmark,
  ArrowRight,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import { Client } from "@/lib/types"; // Adjust this import based on your actual Client type definition

interface FilterOption {
  id: string;
  label: string;
  count?: number;
  color?: string;
}

interface FilterSection {
  id: string;
  name: string;
  type: 'checkbox' | 'range' | 'select' | 'date' | 'tags';
  options?: FilterOption[];
  min?: number;
  max?: number;
  value?: any;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string;
  filters: Record<string, any>;
  createdAt: Date;
  isDefault?: boolean;
}

export interface AdvancedClientFiltersProps {
  onFiltersChange: (filters: {
    status: string[];
    industry: string[];
    country: string[];
  }) => void;
  clientCount: number;
  filteredCount: number;
}

export function AdvancedClientFilters({ 
  onFiltersChange, 
  clientCount, 
  filteredCount 
}: AdvancedClientFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['status', 'performance']));

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([
    {
      id: 'high-performers',
      name: 'High Performers',
      description: 'Clients with engagement > 8%',
      filters: { 
        engagement: [8, 15], 
        status: ['active'], 
        platforms: ['instagram', 'tiktok'] 
      },
      createdAt: new Date('2025-01-01'),
      isDefault: true
    },
    {
      id: 'needs-attention',
      name: 'Needs Attention',
      description: 'Low performing or problematic clients',
      filters: { 
        engagement: [0, 3], 
        status: ['needs_attention'], 
        lastActivity: '30d' 
      },
      createdAt: new Date('2025-01-02')
    }
  ]);

  const filterSections: FilterSection[] = [
    {
      id: 'status',
      name: 'Account Status',
      type: 'checkbox',
      options: [
        { id: 'active', label: 'Active', count: 892, color: 'bg-mint' },
        { id: 'paused', label: 'Paused', count: 234, color: 'bg-warning' },
        { id: 'needs_attention', label: 'Needs Attention', count: 87, color: 'bg-coral' },
        { id: 'new', label: 'New Clients', count: 45, color: 'bg-info' }
      ]
    },
    {
      id: 'platforms',
      name: 'Social Platforms',
      type: 'checkbox',
      options: [
        { id: 'instagram', label: 'Instagram', count: 756 },
        { id: 'tiktok', label: 'TikTok', count: 543 },
        { id: 'twitter', label: 'Twitter/X', count: 432 },
        { id: 'linkedin', label: 'LinkedIn', count: 321 },
        { id: 'facebook', label: 'Facebook', count: 298 },
        { id: 'youtube', label: 'YouTube', count: 187 }
      ]
    },
    {
      id: 'industry',
      name: 'Industry',
      type: 'checkbox',
      options: [
        { id: 'technology', label: 'Technology', count: 234 },
        { id: 'fashion', label: 'Fashion & Beauty', count: 198 },
        { id: 'fitness', label: 'Health & Fitness', count: 176 },
        { id: 'food', label: 'Food & Beverage', count: 154 },
        { id: 'travel', label: 'Travel & Tourism', count: 132 },
        { id: 'education', label: 'Education', count: 98 },
        { id: 'finance', label: 'Finance', count: 87 },
        { id: 'retail', label: 'Retail', count: 76 }
      ]
    },
    {
      id: 'performance',
      name: 'Engagement Rate',
      type: 'range',
      min: 0,
      max: 15
    },
    {
      id: 'revenue',
      name: 'Monthly Revenue',
      type: 'range',
      min: 0,
      max: 100000
    },
    {
      id: 'followerCount',
      name: 'Follower Count',
      type: 'range',
      min: 0,
      max: 1000000
    },
    {
      id: 'location',
      name: 'Location',
      type: 'select',
      options: [
        { id: 'us', label: 'United States' },
        { id: 'ca', label: 'Canada' },
        { id: 'uk', label: 'United Kingdom' },
        { id: 'au', label: 'Australia' },
        { id: 'de', label: 'Germany' },
        { id: 'fr', label: 'France' },
        { id: 'other', label: 'Other' }
      ]
    },
    {
      id: 'lastActivity',
      name: 'Last Activity',
      type: 'select',
      options: [
        { id: '1d', label: 'Last 24 hours' },
        { id: '7d', label: 'Last 7 days' },
        { id: '30d', label: 'Last 30 days' },
        { id: '90d', label: 'Last 90 days' },
        { id: '1y', label: 'Last year' }
      ]
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'tags'
    }
  ];

  const commonTags = [
    'High Priority', 'VIP Client', 'New Campaign', 'Seasonal', 'B2B', 'B2C', 
    'Influencer', 'E-commerce', 'Startup', 'Enterprise', 'Local Business', 'International'
  ];

  const toggleSection = (sectionId: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);
  };

  const updateFilter = (sectionId: string, value: any) => {
    const newFilters = { ...activeFilters, [sectionId]: value };
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilter = (sectionId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[sectionId];
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
    onFiltersChange({});
  };

  const applySavedFilter = (filter: SavedFilter) => {
    setActiveFilters(filter.filters);
    onFiltersChange(filter.filters);
  };

  const saveCurrentFilter = () => {
    // In a real app, this would open a dialog to name and save the filter
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: 'Custom Filter',
      description: 'User-defined filter',
      filters: activeFilters,
      createdAt: new Date()
    };
    setSavedFilters([...savedFilters, newFilter]);
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).length + (searchQuery ? 1 : 0);
  };

  const formatRangeValue = (value: number, sectionId: string) => {
    if (sectionId === 'revenue') {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    if (sectionId === 'followerCount') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      return value.toString();
    }
    return `${value}%`;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, industry, or platform..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={getActiveFilterCount() > 0 ? 'border-primary' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {getActiveFilterCount() > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredCount.toLocaleString()} of {clientCount.toLocaleString()} clients
        </span>
        
        {getActiveFilterCount() > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Advanced Filters</CardTitle>
                <CardDescription>
                  Refine your client search with detailed criteria
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={saveCurrentFilter}>
                  <Save className="h-3 w-3 mr-1" />
                  Save Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applySavedFilter(filter)}
                      className="h-8"
                    >
                      <Bookmark className="h-3 w-3 mr-1" />
                      {filter.name}
                      {filter.isDefault && (
                        <Badge variant="secondary" className="ml-1 h-4 text-xs">
                          Default
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterSections.map((section) => (
                <Collapsible
                  key={section.id}
                  open={openSections.has(section.id)}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                    >
                      <span className="font-medium">{section.name}</span>
                      <div className="flex items-center space-x-2">
                        {activeFilters[section.id] && (
                          <Badge variant="secondary" className="h-4 text-xs">
                            Active
                          </Badge>
                        )}
                        {openSections.has(section.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="space-y-2">
                      {section.type === 'checkbox' && section.options && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {section.options.map((option) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${section.id}-${option.id}`}
                                checked={activeFilters[section.id]?.includes(option.id) || false}
                                onCheckedChange={(checked) => {
                                  const current = activeFilters[section.id] || [];
                                  if (checked) {
                                    updateFilter(section.id, [...current, option.id]);
                                  } else {
                                    updateFilter(section.id, current.filter((id: string) => id !== option.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`${section.id}-${option.id}`}
                                className="text-sm flex items-center space-x-2 cursor-pointer flex-1"
                              >
                                {option.color && (
                                  <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                                )}
                                <span>{option.label}</span>
                                {option.count && (
                                  <span className="text-muted-foreground">({option.count})</span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {section.type === 'range' && (
                        <div className="space-y-3">
                          <Slider
                            value={activeFilters[section.id] || [section.min || 0, section.max || 100]}
                            onValueChange={(value) => updateFilter(section.id, value)}
                            max={section.max || 100}
                            min={section.min || 0}
                            step={section.id === 'revenue' ? 1000 : 1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {formatRangeValue(
                                activeFilters[section.id]?.[0] || section.min || 0, 
                                section.id
                              )}
                            </span>
                            <span>
                              {formatRangeValue(
                                activeFilters[section.id]?.[1] || section.max || 100, 
                                section.id
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {section.type === 'select' && section.options && (
                        <Select
                          value={activeFilters[section.id] || ''}
                          onValueChange={(value) => updateFilter(section.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${section.name.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {section.options.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {section.type === 'tags' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {commonTags.map((tag) => (
                              <Button
                                key={tag}
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => {
                                  const current = activeFilters.tags || [];
                                  if (current.includes(tag)) {
                                    updateFilter('tags', current.filter((t: string) => t !== tag));
                                  } else {
                                    updateFilter('tags', [...current, tag]);
                                  }
                                }}
                              >
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                                {activeFilters.tags?.includes(tag) && (
                                  <X className="h-2 w-2 ml-1" />
                                )}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeFilters[section.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearFilter(section.id)}
                          className="w-full mt-2"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear {section.name}
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Search className="h-3 w-3" />
              <span>Search: {searchQuery}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          
          {Object.entries(activeFilters).map(([key, value]) => {
            const section = filterSections.find(s => s.id === key);
            if (!section) return null;
            
            return (
              <Badge key={key} variant="secondary" className="flex items-center space-x-1">
                <span>
                  {section.name}: {Array.isArray(value) ? 
                    (section.type === 'range' ? 
                      `${formatRangeValue(value[0], key)} - ${formatRangeValue(value[1], key)}` :
                      `${value.length} selected`
                    ) : value}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => clearFilter(key)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
} 