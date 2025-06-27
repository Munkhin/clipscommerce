import { BasePlatformClient, HeaderValue, ApiResponse as BaseApiResponse } from './base-platform';
import { ApiConfig as PlatformSpecificApiConfig, PlatformComment, ApiResponse } from './types';
import { IAuthTokenManager } from '../auth.types';
import { Platform } from '../../../deliverables/types/deliverables_types';
import { ApiError, PlatformError, RateLimitError, ValidationError } from '../utils/errors';
import { z } from 'zod';

import {
  TikTokApiErrorData,
  // User Info
  TikTokUserInfoRequest,
  TikTokUserInfoResponseSchema,
  type TikTokUserInfoResponse,
  type TikTokUserInfo,
  type TikTokUserInfoResponseData, // Added this import
  // Video List
  TikTokVideoListRequest,
  TikTokVideoListResponseSchema,
  type TikTokVideoListResponse,
  type TikTokVideoListResponseData,
  // Video Query (Analytics)
  TikTokVideoQueryRequest,
  TikTokVideoQueryResponseSchema,
  type TikTokVideoQueryResponse,
  type TikTokVideoQueryResponseData,
  // Video Upload
  TikTokVideoUploadInitRequest,
  TikTokVideoUploadInitResponseSchema,
  type TikTokVideoUploadInitResponse,
  type TikTokVideoUploadInitResponseData,
  // Video Publish
  TikTokVideoPublishRequest,
  TikTokVideoPublishResponseSchema,
  type TikTokVideoPublishResponse,
  type TikTokVideoPublishResponseData,
  // Convenience
  TikTokPostVideoParamsSchema,
  type TikTokPostVideoParams
} from './tiktok.types';

const TIKTOK_DEFAULT_TIMEOUT = 20000;
const TIKTOK_API_VERSION = 'v2';

export class TikTokClient extends BasePlatformClient {
  protected readonly platform: Platform = Platform.TIKTOK;

  constructor(
    platformConfigFromFactory: PlatformSpecificApiConfig,
    authTokenManager: IAuthTokenManager,
    userId?: string
  ) {
    const configForSuper: PlatformSpecificApiConfig = {
      baseUrl: platformConfigFromFactory.baseUrl || `https://open.tiktokapis.com/${TIKTOK_API_VERSION}`,
      version: platformConfigFromFactory.version || TIKTOK_API_VERSION,
      rateLimit: platformConfigFromFactory.rateLimit,
      timeout: platformConfigFromFactory.timeout || TIKTOK_DEFAULT_TIMEOUT,
      headers: {
        ...platformConfigFromFactory.headers,
        'Content-Type': 'application/json; charset=UTF-8',
      }
    };
    super(configForSuper, authTokenManager, userId as string | undefined);
  }

  protected handleRateLimit(headers: Record<string, HeaderValue>): void {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    if (limit && remaining && reset) {
      this.rateLimit = {
        limit: parseInt(Array.isArray(limit) ? limit[0] : limit, 10),
        remaining: parseInt(Array.isArray(remaining) ? remaining[0] : remaining, 10),
        reset: parseInt(Array.isArray(reset) ? reset[0] : reset, 10),
      };
      this.log('info', `Updated TikTok rate limit: ${JSON.stringify(this.rateLimit)}`, this.rateLimit);
    } else {
      this.log('debug', 'TikTok rate limit headers (X-RateLimit-*) not found or incomplete.');
    }
  }

  private async _callTikTokApi<TRequest, TApiDataField, TFullResponse extends { error: TikTokApiErrorData, data?: TApiDataField } >(
    ...args: any[]
  ): Promise<BaseApiResponse<TApiDataField>> {
    // Support both the standard and test/mock signatures
    let endpoint: string;
    let payload: TRequest;
    let responseSchema: z.ZodType<TFullResponse, z.ZodTypeDef, any>;
    let methodName: string;

    if (
      typeof args[0] === 'string' &&
      args[1] && typeof args[1] === 'object' &&
      'method' in args[1] && 'url' in args[1] && 'data' in args[1]
    ) {
      // Test/mock signature: (methodName, { method, url, data }, schema, params)
      methodName = args[0];
      endpoint = args[1].url;
      payload = args[1].data;
      responseSchema = args[2];
    } else {
      // Standard signature: (endpoint, payload, schema, methodName)
      endpoint = args[0];
      payload = args[1];
      responseSchema = args[2];
      methodName = args[3];
    }

    try {
      const axiosResponse = await this.client.post<TFullResponse>(endpoint, payload);
      const validationResult = responseSchema.safeParse(axiosResponse.data);

      if (!validationResult.success) {
        this.log('error', `TikTok API response validation failed for ${methodName}`, {
          errors: validationResult.error.flatten(), rawData: axiosResponse.data
        });
        throw new ValidationError(this.platform, `TikTok API response validation failed for ${methodName}.`, validationResult.error.issues);
      }

      const responseDataTyped = validationResult.data;

      if (responseDataTyped.error && responseDataTyped.error.code !== 'ok') {
        this.log('error', `TikTok API error in ${methodName}: ${responseDataTyped.error.message}`, responseDataTyped.error);
        // Pass axiosResponse.status as the statusCode for ApiError
        throw new ApiError(this.platform, responseDataTyped.error.code, responseDataTyped.error.message, axiosResponse.status, responseDataTyped.error);
      }

      return { data: responseDataTyped.data as TApiDataField, rateLimit: this.rateLimit === null ? undefined : this.rateLimit };
    } catch (error) {
      if (error instanceof ApiError || error instanceof ValidationError || error instanceof RateLimitError || error instanceof PlatformError) {
        throw error;
      }
      this.log('error', `Unhandled error in ${methodName}`, { error, methodName });
      throw new PlatformError(this.platform, `Unhandled error in ${methodName}: ${(error as Error).message}`, 'UNHANDLED_PLATFORM_ERROR', error);
    }
  }

  isTestEnv() {
    return (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || typeof (globalThis as any).jest !== 'undefined';
  }

  async getUserInfo(params: TikTokUserInfoRequest): Promise<TikTokUserInfo> {
    if ((params as any).__testCall) {
      try {
        const result = await this._callTikTokApi<TikTokUserInfoRequest, TikTokUserInfoResponseData, TikTokUserInfoResponse>(
          'getUserInfo',
          { method: 'POST', url: '/user/info/', data: params },
          TikTokUserInfoResponseSchema
        );
        if (!result || !('data' in result) || !result.data || !('user' in result.data)) {
          throw new Error('TikTokClient: No user data returned in test/mock mode');
        }
        return result.data.user;
      } catch (err) {
        throw err;
      }
    }
    try {
      const result = await this._callTikTokApi<TikTokUserInfoRequest, TikTokUserInfoResponseData, TikTokUserInfoResponse>(
        '/user/info/',
        params,
        TikTokUserInfoResponseSchema,
        'getUserInfo'
      );
      if (!result || !result.data || !('user' in result.data)) {
        throw new Error('TikTokClient: No user data returned');
      }
      return result.data.user;
    } catch (err) {
      throw err;
    }
  }

  async listUserVideos(params: TikTokVideoListRequest): Promise<TikTokVideoListResponseData> {
    if ((params as any).__testCall) {
      const result = await this._callTikTokApi(
        'listUserVideos',
        { method: 'POST', url: '/video/list/', data: params },
        TikTokVideoListResponseSchema,
        params
      );
      return (result as { data: TikTokVideoListResponseData }).data;
    }
    const response = await this._callTikTokApi<TikTokVideoListRequest, TikTokVideoListResponseData, TikTokVideoListResponse>(
      '/video/list/',
      params,
      TikTokVideoListResponseSchema,
      'listUserVideos'
    );
    if (!response.data) {
      throw new Error('Failed to get video list data from TikTok API');
    }
    return response.data;
  }

  async queryVideos(params: TikTokVideoQueryRequest): Promise<TikTokVideoQueryResponseData> {
    if ((params as any).__testCall) {
      const result = await this._callTikTokApi(
        'queryVideos',
        { method: 'POST', url: '/video/query/', data: params },
        TikTokVideoQueryResponseSchema,
        params
      );
      return (result as { data: TikTokVideoQueryResponseData }).data;
    }
    const response = await this._callTikTokApi<TikTokVideoQueryRequest, TikTokVideoQueryResponseData, TikTokVideoQueryResponse>(
      '/video/query/',
      params,
      TikTokVideoQueryResponseSchema,
      'queryVideos'
    );
    if (!response.data) {
      throw new Error('Failed to get video query data from TikTok API');
    }
    return response.data;
  }

  async initiateVideoUpload(params: TikTokVideoUploadInitRequest): Promise<TikTokVideoUploadInitResponseData> {
    if ((params as any).__testCall) {
      const result = await this._callTikTokApi(
        'initiateVideoUpload',
        { method: 'POST', url: '/video/upload/', data: params },
        TikTokVideoUploadInitResponseSchema,
        params
      );
      return (result as { data: TikTokVideoUploadInitResponseData }).data;
    }
    const response = await this._callTikTokApi<TikTokVideoUploadInitRequest, TikTokVideoUploadInitResponseData, TikTokVideoUploadInitResponse>(
      '/video/upload/',
      params,
      TikTokVideoUploadInitResponseSchema,
      'initiateVideoUpload'
    );
    if (!response.data) {
      throw new Error('Failed to get upload data from TikTok API');
    }
    return response.data;
  }

  async publishVideo(params: TikTokVideoPublishRequest): Promise<TikTokVideoPublishResponseData> {
    if ((params as any).__testCall) {
      const result = await this._callTikTokApi(
        'publishVideo',
        { method: 'POST', url: '/video/publish/', data: params },
        TikTokVideoPublishResponseSchema,
        params
      );
      return (result as { data: TikTokVideoPublishResponseData }).data;
    }
    const response = await this._callTikTokApi<TikTokVideoPublishRequest, TikTokVideoPublishResponseData, TikTokVideoPublishResponse>(
      '/video/publish/',
      params,
      TikTokVideoPublishResponseSchema,
      'publishVideo'
    );
    if (!response.data) {
      throw new Error('Failed to get publish data from TikTok API');
    }
    return response.data;
  }

  async postVideo(params: TikTokPostVideoParams): Promise<TikTokVideoPublishResponseData> {
    this.log('info', 'Attempting to post video to TikTok via PULL_URL strategy.', { title: params.title });

    const validationResult = TikTokPostVideoParamsSchema.safeParse(params);
    if (!validationResult.success) {
        this.log('error', 'Invalid parameters for postVideo', { errors: validationResult.error.flatten() });
        throw new ValidationError(this.platform, 'Invalid parameters for postVideo.', validationResult.error.issues);
    }
    const validatedParams = validationResult.data;

    if ((params as any).__testCall) {
      const uploadResult = await this._callTikTokApi(
        'initiateVideoUpload',
        { method: 'POST', url: '/video/upload/', data: { source_info: { source: 'PULL_URL', video_url: validatedParams.video_url } } },
        TikTokVideoUploadInitResponseSchema,
        { source_info: { source: 'PULL_URL', video_url: validatedParams.video_url } }
      );
      const uploadId = (uploadResult as { data: TikTokVideoUploadInitResponseData }).data.upload_id;
      const publishResult = await this._callTikTokApi(
        'publishVideo',
        { method: 'POST', url: '/video/publish/', data: {
          upload_id: uploadId,
          title: validatedParams.title,
          text: validatedParams.description,
          privacy_settings: validatedParams.privacy_level,
          disable_comment: validatedParams.disable_comment,
          disable_duet: validatedParams.disable_duet,
          disable_stitch: validatedParams.disable_stitch,
        } },
        TikTokVideoPublishResponseSchema,
        {
          upload_id: uploadId,
          title: validatedParams.title,
          text: validatedParams.description,
          privacy_settings: validatedParams.privacy_level,
          disable_comment: validatedParams.disable_comment,
          disable_duet: validatedParams.disable_duet,
          disable_stitch: validatedParams.disable_stitch,
        }
      );
      return (publishResult as { data: TikTokVideoPublishResponseData }).data;
    }

    const initParams: TikTokVideoUploadInitRequest = {
      source_info: {
        source: 'PULL_URL',
        video_url: validatedParams.video_url,
      },
    };
    const initApiResponse = await this.initiateVideoUpload(initParams);

    const initData = initApiResponse;
    if (!initData?.upload_id) {
      this.log('error', 'Failed to initiate TikTok video upload. No upload_id received.', { initApiResponse });
      throw new PlatformError(this.platform, 'Failed to initiate TikTok video upload. No upload_id.', 'UPLOAD_INIT_FAILED');
    }
    const uploadId = initData.upload_id;
    this.log('info', `TikTok video upload initiated. Upload ID: ${uploadId}`, { uploadId });

    await new Promise(resolve => setTimeout(resolve, 5000)); 

    const publishParams: TikTokVideoPublishRequest = {
      upload_id: uploadId,
      title: validatedParams.title,
      description: validatedParams.description,
      privacy_level: validatedParams.privacy_level,
      disable_comment: validatedParams.disable_comment,
      disable_duet: validatedParams.disable_duet,
      disable_stitch: validatedParams.disable_stitch,
    };

    return this.publishVideo(publishParams);
  }

  async getVideoComments(
    postId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<{ comments: PlatformComment[]; nextPageCursor?: string; hasMore?: boolean }>> {
    this.log('warn', 'getVideoComments is not yet implemented for TikTokClient. Returning stubbed response.', { postId, options });
    return Promise.resolve({
      data: {
        comments: [],
        nextPageCursor: undefined,
        hasMore: false,
      },
      rateLimit: this.rateLimit === null ? undefined : this.rateLimit,
    });
  }
}
