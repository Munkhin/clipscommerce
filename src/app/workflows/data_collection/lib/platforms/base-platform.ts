import { IAuthTokenManager } from '../auth.types';
import { ApiConfig, ApiRateLimit, ApiResponse, Platform } from './types';
import { ApiError, RateLimitError } from '../utils/errors';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosHeaders } from 'axios';

export type HeaderValue = string | string[] | number | boolean;

// Note: ApiResponse is available through direct import from './types'


// Define basic types locally to avoid import issues
interface Post {
  id: string;
  platform: string;
  title?: string;
  content?: string;
  createdAt: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

interface Analytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate?: number;
}

// Simple logger interface
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data || ''),
};

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
      // This will be overridden by platform-specific clients that know their platform
      const platformId = (this as any).platform || Platform.TIKTOK; // Fallback to TikTok
      const credentials = await this.authTokenManager.getValidCredentials({
        platform: platformId,
        userId: this.userId
      });
      if (credentials && credentials.strategy === 'oauth2') {
        const oauth2Creds = credentials as any;
        config.headers.Authorization = `Bearer ${oauth2Creds.accessToken}`;
      } else if (credentials && credentials.strategy === 'api_key') {
        const apiKeyCreds = credentials as any;
        config.headers['X-API-Key'] = apiKeyCreds.apiKey;
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
            return this.client.request(error.config!);
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
        const platformId = (this as any).platform || Platform.TIKTOK; // Fallback to TikTok
        throw new ApiError(
          platformId,
          'REQUEST_FAILED',
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
  abstract listUserVideos(options?: any): Promise<any>;
}
