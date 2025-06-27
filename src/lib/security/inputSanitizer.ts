import { z } from 'zod';
import validator from 'validator';
import { createDOMPurify } from 'isomorphic-dompurify';

// Initialize DOMPurify for both server and client environments
const DOMPurify = createDOMPurify();

/**
 * Comprehensive Input Sanitization and Validation Utility
 * 
 * Provides centralized input sanitization to prevent:
 * - XSS attacks
 * - SQL injection
 * - AI prompt injection
 * - File upload vulnerabilities
 * - Path traversal attacks
 */

// Configuration for different sanitization levels
export interface SanitizationConfig {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  normalizeNewlines?: boolean;
  removeControlChars?: boolean;
  escapeQuotes?: boolean;
}

export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  allowHtml: false,
  maxLength: 10000,
  trimWhitespace: true,
  normalizeNewlines: true,
  removeControlChars: true,
  escapeQuotes: false
};

// Validation schemas for common input types
export const validationSchemas = {
  // Basic string validation
  safeString: z.string()
    .min(1, 'String cannot be empty')
    .max(10000, 'String too long')
    .refine(val => !containsScriptTags(val), 'Contains potentially malicious content'),

  // AI prompt validation - prevents prompt injection
  aiPrompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(4000, 'Prompt too long')
    .refine(val => !containsPromptInjection(val), 'Contains potential prompt injection')
    .refine(val => !containsSystemPrompts(val), 'Contains system-level prompts')
    .refine(val => !containsMaliciousPatterns(val), 'Contains malicious patterns'),

  // User content for display
  userContent: z.string()
    .max(50000, 'Content too long')
    .refine(val => !containsScriptTags(val), 'Contains script tags')
    .refine(val => !containsSqlInjection(val), 'Contains SQL injection patterns'),

  // Email validation
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .refine(val => validator.isEmail(val), 'Invalid email address'),

  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .refine(val => isAllowedProtocol(val), 'Disallowed protocol')
    .refine(val => !containsScriptProtocol(val), 'Contains script protocol'),

  // File upload validation
  filename: z.string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename too long')
    .refine(val => !containsPathTraversal(val), 'Contains path traversal')
    .refine(val => hasAllowedExtension(val), 'Disallowed file extension')
    .refine(val => !containsNullBytes(val), 'Contains null bytes'),

  // Hashtag validation
  hashtag: z.string()
    .min(1, 'Hashtag cannot be empty')
    .max(100, 'Hashtag too long')
    .regex(/^#?[a-zA-Z0-9_]+$/, 'Invalid hashtag characters'),

  // Platform identifier
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']),

  // Database ID validation
  id: z.string()
    .uuid('Invalid ID format')
    .or(z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID characters')),

  // Numeric validation
  positiveInteger: z.number()
    .int('Must be an integer')
    .positive('Must be positive'),

  // API key validation
  apiKey: z.string()
    .min(10, 'API key too short')
    .max(200, 'API key too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key characters'),
};

// Core sanitization functions
export class InputSanitizer {
  /**
   * Sanitize general text input
   */
  static sanitizeText(
    input: string, 
    config: SanitizationConfig = DEFAULT_SANITIZATION_CONFIG
  ): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    let sanitized = input;

    // Trim whitespace if configured
    if (config.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Enforce maximum length
    if (config.maxLength && sanitized.length > config.maxLength) {
      sanitized = sanitized.substring(0, config.maxLength);
    }

    // Remove control characters
    if (config.removeControlChars) {
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    // Normalize newlines
    if (config.normalizeNewlines) {
      sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    // Escape quotes if needed
    if (config.escapeQuotes) {
      sanitized = sanitized.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    // Handle HTML content
    if (config.allowHtml) {
      // Use DOMPurify to clean HTML while preserving safe tags
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
        ALLOWED_ATTR: []
      });
    } else {
      // Strip all HTML tags
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }

    return sanitized;
  }

  /**
   * Sanitize AI prompt input to prevent prompt injection
   */
  static sanitizeAIPrompt(prompt: string): string {
    if (typeof prompt !== 'string') {
      throw new Error('Prompt must be a string');
    }

    let sanitized = prompt;

    // Remove common prompt injection patterns
    const injectionPatterns = [
      // System prompt overrides
      /ignore\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
      /system\s*:\s*/gi,
      /assistant\s*:\s*/gi,
      /human\s*:\s*/gi,
      
      // Jailbreak attempts
      /pretend\s+(to\s+be|you\s+are)/gi,
      /roleplay\s+as/gi,
      /act\s+as\s+if/gi,
      /simulate\s+(being|that)/gi,
      
      // Command injection
      /\$\{[^}]*\}/g,
      /`[^`]*`/g,
      /<[^>]*>/g,
      
      // Escape sequences
      /\\[nrtbfav]/g,
      /\x[0-9a-fA-F]{2}/g,
      /\u[0-9a-fA-F]{4}/g,
    ];

    injectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Limit length and clean
    sanitized = this.sanitizeText(sanitized, {
      maxLength: 4000,
      trimWhitespace: true,
      allowHtml: false,
      removeControlChars: true
    });

    return sanitized;
  }

  /**
   * Sanitize user content for safe display
   */
  static sanitizeUserContent(content: string, allowBasicHtml = false): string {
    return this.sanitizeText(content, {
      allowHtml: allowBasicHtml,
      maxLength: 50000,
      trimWhitespace: true,
      normalizeNewlines: true,
      removeControlChars: true
    });
  }

  /**
   * Sanitize filename for file uploads
   */
  static sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') {
      throw new Error('Filename must be a string');
    }

    let sanitized = filename;

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Limit to alphanumeric, dots, dashes, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Ensure it doesn't start with a dot
    sanitized = sanitized.replace(/^\.+/, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Sanitize database inputs to prevent SQL injection
   */
  static sanitizeDatabaseInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Remove common SQL injection patterns
    let sanitized = input;
    
    const sqlPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
      /(\bUNION\b|\bJOIN\b)/gi,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
      /(\bOR\b|\bAND\b)\s+['"].*['"]\s*=\s*['"].*['"]/gi,
      /[';]/g,
      /--/g,
      /\/\*/g,
      /\*\//g,
      /xp_/gi,
      /sp_/gi
    ];

    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return this.sanitizeText(sanitized);
  }

  /**
   * Validate and sanitize API parameters
   */
  static sanitizeApiParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitize key names
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value);
      } else if (typeof value === 'number') {
        sanitized[sanitizedKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? this.sanitizeText(item) : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeApiParams(value);
      }
    }

    return sanitized;
  }
}

// Validation helper functions
function containsScriptTags(input: string): boolean {
  return /<script[^>]*>.*?<\/script>/gi.test(input) || 
         /javascript:/gi.test(input) ||
         /vbscript:/gi.test(input) ||
         /data:/gi.test(input);
}

function containsPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /human\s*:\s*/gi,
    /pretend\s+(to\s+be|you\s+are)/gi,
    /roleplay\s+as/gi,
    /act\s+as\s+if/gi,
    /simulate\s+(being|that)/gi
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}

function containsSystemPrompts(input: string): boolean {
  const systemPrompts = [
    /system\s*:/gi,
    /\[system\]/gi,
    /assistant\s*:/gi,
    /\[assistant\]/gi,
    /human\s*:/gi,
    /\[human\]/gi,
    /user\s*:/gi,
    /\[user\]/gi
  ];

  return systemPrompts.some(pattern => pattern.test(input));
}

function containsMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    /\$\{[^}]*\}/g, // Template literals
    /`[^`]*`/g,     // Backticks
    /eval\s*\(/gi,  // eval() calls
    /function\s*\(/gi, // Function declarations
    /=\s*>/g,       // Arrow functions
    /\bon\w+\s*=/gi // Event handlers
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
    /(\bUNION\b|\bJOIN\b)/gi,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
    /[';]/g,
    /--/g,
    /\/\*/g
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

function isAllowedProtocol(url: string): boolean {
  const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
  try {
    const urlObj = new URL(url);
    return allowedProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

function containsScriptProtocol(url: string): boolean {
  return /^(javascript|vbscript|data):/gi.test(url);
}

function containsPathTraversal(filename: string): boolean {
  return /\.\./g.test(filename) || /[\/\\]/g.test(filename);
}

function hasAllowedExtension(filename: string): boolean {
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp4', '.mov', '.avi', '.webm',
    '.pdf', '.doc', '.docx', '.txt', '.csv',
    '.json', '.xml'
  ];
  
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

function containsNullBytes(input: string): boolean {
  return input.includes('\0');
}

// Export validation schemas and utilities
export { validationSchemas as schemas };

// Validation middleware for API routes
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

// Rate limiting utility for validation
export class ValidationRateLimit {
  private static attempts = new Map<string, { count: number; timestamp: number }>();
  private static readonly MAX_ATTEMPTS = 10;
  private static readonly WINDOW_MS = 60000; // 1 minute

  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    // Reset if window expired
    if (now - record.timestamp > this.WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    // Check if limit exceeded
    if (record.count >= this.MAX_ATTEMPTS) {
      return false;
    }

    // Increment count
    record.count++;
    return true;
  }
}