import axios, { AxiosInstance, AxiosError } from 'axios';
import { InstagramApiMediaNode, InstagramApiUserNode } from '../../types/instagramTypes';

const INSTAGRAM_GRAPH_API_VERSION = 'v19.0'; // Using a more recent version
const INSTAGRAM_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;

interface InstagramApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

class InstagramApiClient {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      console.warn('Instagram access token is not configured. API calls will likely fail.');
      // In a real app, you might throw an error here or handle it more gracefully
    }

    this.client = axios.create({
      baseURL: INSTAGRAM_BASE_URL,
      timeout: 15000, // 15 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (!config.params) {
        config.params = {};
      }
      // Only add access_token if it's not explicitly set to null for this request
      if (config.params.access_token !== null) {
        config.params.access_token = this.accessToken;
      }
      // Remove null marker if it was used
      if (config.params.access_token === null) {
          delete config.params.access_token;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<InstagramApiErrorResponse>) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const apiError = error.response.data.error;
          console.error(
            `Instagram API Error: ${apiError.message} (Type: ${apiError.type}, Code: ${apiError.code}, Subcode: ${apiError.error_subcode || 'N/A'})`
          );
        } else if (error.request) {
          // The request was made but no response was received
          console.error('Instagram API Error: No response received from server.', error.message);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Instagram API Error: Error setting up request.', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      // Error is already logged by the interceptor
      return null;
    }
  }

  /**
   * Fetches basic data about an Instagram user.
   * @param userId The Instagram User ID (platform ID).
   * @param fields A comma-separated string of fields to retrieve. 
   *               Defaults to 'id,username,account_type,media_count,followers_count,follows_count,name,profile_picture_url,biography,website'.
   * @returns User data or null if an error occurs.
   */
  async getUserInfo(userId: string = 'me', fields?: string): Promise<InstagramApiUserNode | null> {
    const defaultFields = 'id,username,account_type,media_count,followers_count,follows_count,name,profile_picture_url,biography,website';
    return this.get<InstagramApiUserNode>(`/${userId}`, {
      fields: fields || defaultFields,
    });
  }

  /**
   * Fetches recent media for an Instagram user.
   * NOTE: The 'caption' field is always treated as the video/post description (not subtitle).
   * @param userId The Instagram User ID (platform ID).
   * @param fields A comma-separated string of fields for each media item. 
   *               Defaults to 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner'.
   * @param limit The maximum number of media items to retrieve (default 25, max typically 100-200 depending on endpoint and token type).
   * @returns A paginated list of media items or null if an error occurs.
   */
  async getUserMedia(
    userId: string = 'me',
    fields?: string,
    limit: number = 25
  ): Promise<{ data: InstagramApiMediaNode[]; paging?: any } | null> {
    const defaultFields =
      'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner';
    return this.get<{ data: InstagramApiMediaNode[]; paging?: any }>(`/${userId}/media`, {
      fields: fields || defaultFields,
      limit,
    });
  }

  /**
   * Fetches details for a specific media item.
   * @param mediaId The ID of the media item.
   * @param fields A comma-separated string of fields for the media item.
   *               Defaults to 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner'.
   * @returns Media item data or null if an error occurs.
   */
  async getMediaDetails(mediaId: string, fields?: string): Promise<InstagramApiMediaNode | null> {
    const defaultFields =
      'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type},comments_count,like_count,owner';
    return this.get<InstagramApiMediaNode>(`/${mediaId}`, {
      fields: fields || defaultFields,
    });
  }

  /**
   * Handles pagination for API endpoints that support it.
   * @param url The full URL for the next/previous page of results (from the 'paging' object).
   * @returns Data from the paginated URL or null if an error occurs.
   */
  async getPaginatedData<T>(paginationUrl: string): Promise<T | null> {
    if (!this.accessToken) {
        console.error('Access token is missing for paginated request.');
        return null;
    }
    // Paginated URLs from Instagram already include the access token.
    // We need to make sure our client doesn't try to add it again.
    // The base URL interceptor will also not apply here as it's a full URL.
    try {
      const response = await axios.get<T>(paginationUrl, {
        timeout: this.client.defaults.timeout, // use client's timeout
      });
      return response.data;
    } catch (error) {
      // Handle and log error similarly to the main client's interceptor
      const axiosError = error as AxiosError<InstagramApiErrorResponse>;
      if (axiosError.response) {
        const apiError = axiosError.response.data.error;
        console.error(
          `Instagram API Pagination Error: ${apiError.message} (Type: ${apiError.type}, Code: ${apiError.code}, Subcode: ${apiError.error_subcode || 'N/A'})`
        );
      } else if (axiosError.request) {
        console.error('Instagram API Pagination Error: No response received.', axiosError.message);
      } else {
        console.error('Instagram API Pagination Error: Error setting up request.', axiosError.message);
      }
      return null;
    }
  }
}

// Export a singleton instance or allow creating instances as needed
// const instagramClient = new InstagramApiClient();
// export default instagramClient;

export default InstagramApiClient;
