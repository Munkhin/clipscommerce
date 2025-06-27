import { SupabaseClient } from '@supabase/supabase-js';
// Adjust this import path based on your actual Supabase client setup
// It might be in a shared 'lib' folder at the root of 'src'
// For Next.js, it's common to have a utility function to get the client
// e.g., import { createClient } from '@/utils/supabase/client';
// For this example, I'll assume a getSupabaseClient function exists.
// Stub for getSupabaseClient if not exported elsewhere
function getSupabaseClient() { return undefined as any; }

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortingOptions<T> {
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
}

// Define a generic type for items that have an 'id' property
interface Identifiable {
  id: string | number; // Or more specific types like UUID string or number
}

export abstract class BaseRepository<T extends Identifiable, CreateDto, UpdateDto> {
  protected supabase: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.supabase = getSupabaseClient(); // Ensure this function returns your Supabase client instance
    this.tableName = tableName;
  }

  async create(item: CreateDto): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(item as any) // Cast to 'any' if CreateDto isn't directly Supabase-compatible
      .select()
      .single();

    if (error) {
      console.error(`Error creating item in ${this.tableName}: ${error.message}`);
      // Optionally, throw a custom error or return an error object
      return null;
    }
    return data as T;
  }

  async findById(id: T['id']): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST: 'query returned no rows'
        return null; // Standard practice to return null if not found
      }
      console.error(`Error finding item by ID ${id} in ${this.tableName}: ${error.message}`);
      return null;
    }
    return data as T;
  }

  async findAll(options?: PaginationOptions & SortingOptions<T>): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select('*');

    if (options?.sortBy) {
      query = query.order(options.sortBy as string, {
        ascending: options.sortOrder === 'asc',
      });
    }

    if (options?.page && options.pageSize) {
      const offset = (options.page - 1) * options.pageSize;
      query = query.range(offset, offset + options.pageSize - 1);
    } else if (options?.pageSize) {
      // If only pageSize is provided, limit the results (effectively page 1)
      query = query.limit(options.pageSize);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching all items from ${this.tableName}: ${error.message}`);
      return [];
    }
    return (data as T[]) || []; // Ensure an array is always returned
  }

  async update(id: T['id'], item: UpdateDto): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(item as any) // Cast to 'any' if UpdateDto isn't directly Supabase-compatible
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating item with ID ${id} in ${this.tableName}: ${error.message}`);
      return null;
    }
    return data as T;
  }

  async delete(id: T['id']): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting item with ID ${id} in ${this.tableName}: ${error.message}`);
      return false;
    }
    return true;
  }

  /**
   * Finds records by a specific column and value.
   * @param columnName The name of the column to filter by.
   * @param value The value to match in the specified column.
   * @param options Optional pagination and sorting options.
   * @returns A promise that resolves to an array of matching records.
   */
  async findByColumn(columnName: keyof T, value: any, options?: PaginationOptions & SortingOptions<T>): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select('*').eq(columnName as string, value);

    if (options?.sortBy) {
      query = query.order(options.sortBy as string, { ascending: options.sortOrder === 'asc' });
    }

    if (options?.page && options.pageSize) {
      const offset = (options.page - 1) * options.pageSize;
      query = query.range(offset, offset + options.pageSize - 1);
    } else if (options?.pageSize) {
      query = query.limit(options.pageSize);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error finding items by ${String(columnName)} in ${this.tableName}: ${error.message}`);
      return [];
    }
    return (data as T[]) || [];
  }

  /**
   * Logs an API call to the 'api_call_logs' table.
   * This is a utility function that can be called by platform-specific services.
   */
  public async logApiCall(
    platform: string,
    endpoint: string,
    requestParams?: object,
    responseStatus?: number,
    responseData?: object,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error: logError } = await this.supabase.from('api_call_logs').insert({
        platform,
        endpoint,
        request_params: requestParams || null,
        response_status: responseStatus,
        response_data: responseData || null,
        error_message: errorMessage,
      });

      if (logError) {
        console.error('Failed to log API call to Supabase:', logError.message);
      }
    } catch (err: any) {
      console.error('Exception during API call logging:', err.message);
    }
  }
}
