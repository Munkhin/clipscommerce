// Global type definitions
export interface GlobalTypes {
  // Add global types as needed
}

// Re-export common types
export * from './platform';
export * from './api';
export * from './user';

// Generic utility types
export type ID = string;
export type Timestamp = string;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Common response wrapper
export interface ApiResponseWrapper<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

// Pagination types
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}