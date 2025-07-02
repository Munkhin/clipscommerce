'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'select' | 'multiselect' | 'input' | 'date' | 'checkbox';
  options?: { label: string; value: string }[];
}

export interface ActiveFilter {
  id: string;
  label: string;
  value: string | string[];
}

export interface AdvancedClientFiltersProps {
  filterOptions?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onFiltersChange?: (filters: ActiveFilter[]) => void;
  onFilterApply?: (filters: ActiveFilter[]) => void;
  onFilterClear?: () => void;
  className?: string;
}

const defaultFilterOptions: FilterOption[] = [
  {
    id: 'status',
    label: 'Client Status',
    value: '',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Pending', value: 'pending' }
    ]
  },
  {
    id: 'industry',
    label: 'Industry',
    value: '',
    type: 'multiselect',
    options: [
      { label: 'Technology', value: 'tech' },
      { label: 'Healthcare', value: 'healthcare' },
      { label: 'Finance', value: 'finance' },
      { label: 'Retail', value: 'retail' }
    ]
  },
  {
    id: 'search',
    label: 'Search',
    value: '',
    type: 'input'
  },
  {
    id: 'premium',
    label: 'Premium Client',
    value: '',
    type: 'checkbox'
  }
];

export function AdvancedClientFilters({ 
  filterOptions = defaultFilterOptions,
  activeFilters = [],
  onFiltersChange,
  onFilterApply,
  onFilterClear,
  className 
}: AdvancedClientFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ActiveFilter[]>(activeFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    const filterOption = filterOptions.find(f => f.id === filterId);
    if (!filterOption) return;

    const existingFilterIndex = localFilters.findIndex(f => f.id === filterId);
    const newFilter: ActiveFilter = {
      id: filterId,
      label: filterOption.label,
      value
    };

    let newFilters: ActiveFilter[];
    if (existingFilterIndex >= 0) {
      newFilters = [...localFilters];
      if (value === '' || (Array.isArray(value) && value.length === 0)) {
        newFilters.splice(existingFilterIndex, 1);
      } else {
        newFilters[existingFilterIndex] = newFilter;
      }
    } else if (value !== '' && (!Array.isArray(value) || value.length > 0)) {
      newFilters = [...localFilters, newFilter];
    } else {
      newFilters = localFilters;
    }

    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterApply?.(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters([]);
    onFilterClear?.();
    onFiltersChange?.([]);
  };

  const removeFilter = (filterId: string) => {
    const newFilters = localFilters.filter(f => f.id !== filterId);
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const renderFilterInput = (option: FilterOption) => {
    const activeFilter = localFilters.find(f => f.id === option.id);
    const value = activeFilter?.value || '';

    switch (option.type) {
      case 'select':
        return (
          <Select 
            value={value as string} 
            onValueChange={(val) => handleFilterChange(option.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              {option.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'input':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${option.label.toLowerCase()}...`}
              value={value as string}
              onChange={(e) => handleFilterChange(option.id, e.target.value)}
              className="pl-10"
            />
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value as boolean}
              onCheckedChange={(checked) => handleFilterChange(option.id, checked ? 'true' : '')}
            />
            <Label htmlFor={option.id}>{option.label}</Label>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>
              Filter and search clients using advanced criteria
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterOptions.map((option) => (
              <div key={option.id} className="space-y-2">
                <Label>{option.label}</Label>
                {renderFilterInput(option)}
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>
              Apply Filters ({localFilters.length})
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>
        </CardContent>
      )}
      
      {/* Active Filters Display */}
      {localFilters.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {localFilters.map((filter) => (
                <Badge key={filter.id} variant="secondary" className="flex items-center gap-1">
                  <span className="text-xs">
                    {filter.label}: {Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                  </span>
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter(filter.id)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default AdvancedClientFilters;