import { IAuthTokenManager } from '../auth.types';
import { ApiConfig, ApiRateLimit, ApiResponse, HeaderValue } from './types';
import { ApiError, RateLimitError } from '../utils/errors';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '@/utils/logger';

// Define core types that are used by platform clients
export interface Post {
  id: string;
  platform: string;
  content: string;
  mediaUrl?: string;
  publishedAt: Date;
  metrics?: Analytics;
}

export interface Analytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export type HeaderValue = string | number | boolean;

// Export ApiResponse for compatibility
export type { ApiResponse } from './types';

export abstract class BasePlatformClient {
  protected readonly client: AxiosInstance;
  protected rateLimit: ApiRateLimit | null = null;

  constructor(
    protected readonly config: ApiConfig,
    protected readonly authTokenManager: IAuthTokenManager,
    protected readonly userId?: string
  ) {
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 10000,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await this.authTokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.handleRateLimit(response.headers);
        return response;
      },
      async (error) => {
        if (axios.isAxiosError(error) && error.response) {
          this.handleRateLimit(error.response.headers);
          if (error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.getRetryDelay();
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return this.client.request(error.config || {});
          }
        }
        return Promise.reject(error);
      }
    );
  }

  protected abstract handleRateLimit(headers: any): void;

  private getRetryDelay(): number {
    // simple exponential backoff
    const baseDelay = 2000;
    const factor = 2;
    const maxDelay = 60000;
    const jitter = Math.random() * 1000;
    const attempt = (this.client.defaults.headers as any)['retry-attempt'] || 0;
    const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay) + jitter;
    (this.client.defaults.headers as any)['retry-attempt'] = attempt + 1;
    return delay;
  }

  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    logger[level](`[${this.constructor.name}] ${message}`, data || '');
  }

  protected async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      const response = await this.client.request<T>(config);
      (this.client.defaults.headers as any)['retry-attempt'] = 0; // reset retry attempt on success
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          'TIKTOK', // platform will be set by subclass - using TIKTOK as default
          error.response?.status?.toString() || '500',
          error.response?.statusText || 'Unknown API Error',
          error.response?.status || 500,
          error.response?.data
        );
      }
      throw error;
    }
  }

  abstract fetchPosts(query: string): Promise<Post[]>;
  abstract uploadContent(content: any): Promise<Post>;
  abstract getAnalytics(postId: string): Promise<Analytics>;
}

// Export HeaderValue for external use - ApiResponse already exported above
export type { HeaderValue } from './types';
