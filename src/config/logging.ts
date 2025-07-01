import path from 'path';

// Logging configuration interface
export interface LoggingConfig {
  level: string;
  environment: string;
  service: string;
  version: string;
  logDirectory: string;
  rotation: {
    enabled: boolean;
    maxFiles: number;
    maxSize: string;
    datePattern: string;
    zippedArchive: boolean;
  };
  retention: {
    days: number;
    maxFiles: number;
  };
  transports: {
    console: {
      enabled: boolean;
      prettyPrint: boolean;
    };
    file: {
      enabled: boolean;
      errorFile: string;
      combinedFile: string;
    };
    json: {
      enabled: boolean;
    };
  };
  correlation: {
    enabled: boolean;
    headerName: string;
    requestIdHeader: string;
  };
  security: {
    maskSensitiveData: boolean;
    sensitiveFields: string[];
  };
}

// Default logging configuration
export const defaultLoggingConfig: LoggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  service: 'clipscommerce',
  version: process.env.npm_package_version || '1.0.0',
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  
  rotation: {
    enabled: process.env.LOG_ROTATION_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    maxSize: process.env.LOG_MAX_SIZE || '50m',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    zippedArchive: process.env.LOG_ZIPPED_ARCHIVE === 'true' || true,
  },
  
  retention: {
    days: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
    maxFiles: parseInt(process.env.LOG_RETENTION_MAX_FILES || '100'),
  },
  
  transports: {
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      prettyPrint: process.env.NODE_ENV === 'development',
    },
    file: {
      enabled: process.env.LOG_FILE_ENABLED !== 'false',
      errorFile: path.join(process.env.LOG_DIRECTORY || './logs', 'error.log'),
      combinedFile: path.join(process.env.LOG_DIRECTORY || './logs', 'combined.log'),
    },
    json: {
      enabled: process.env.NODE_ENV === 'production',
    },
  },
  
  correlation: {
    enabled: true,
    headerName: 'x-correlation-id',
    requestIdHeader: 'x-request-id',
  },
  
  security: {
    maskSensitiveData: process.env.LOG_MASK_SENSITIVE !== 'false',
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'credit_card',
      'ssn',
      'social_security',
      'api_key',
      'private_key',
      'access_token',
      'refresh_token',
    ],
  },
};

// Environment-specific configurations
export const loggingConfigs: Record<string, Partial<LoggingConfig>> = {
  development: {
    level: 'debug',
    transports: {
      console: {
        enabled: true,
        prettyPrint: true,
      },
      file: {
        enabled: false,
        errorFile: './logs/dev-error.log',
        combinedFile: './logs/dev-combined.log',
      },
      json: {
        enabled: false,
      },
    },
    rotation: {
      enabled: false,
      maxFiles: 3,
      maxSize: '10m',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: false,
    },
  },
  
  test: {
    level: 'warn',
    transports: {
      console: {
        enabled: false,
        prettyPrint: false,
      },
      file: {
        enabled: true,
        errorFile: './logs/test-error.log',
        combinedFile: './logs/test-combined.log',
      },
      json: {
        enabled: true,
      },
    },
    rotation: {
      enabled: false,
      maxFiles: 1,
      maxSize: '5m',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
    },
    retention: {
      days: 1,
      maxFiles: 5,
    },
  },
  
  staging: {
    level: 'info',
    transports: {
      console: {
        enabled: true,
        prettyPrint: false,
      },
      file: {
        enabled: true,
        errorFile: './logs/staging-error.log',
        combinedFile: './logs/staging-combined.log',
      },
      json: {
        enabled: true,
      },
    },
    rotation: {
      enabled: true,
      maxFiles: 7,
      maxSize: '100m',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
    },
    retention: {
      days: 14,
      maxFiles: 50,
    },
  },
  
  production: {
    level: 'info',
    transports: {
      console: {
        enabled: true,
        prettyPrint: false,
      },
      file: {
        enabled: true,
        errorFile: './logs/error.log',
        combinedFile: './logs/combined.log',
      },
      json: {
        enabled: true,
      },
    },
    rotation: {
      enabled: true,
      maxFiles: 14,
      maxSize: '200m',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
    },
    retention: {
      days: 90,
      maxFiles: 200,
    },
  },
};

// Get configuration for current environment
export const getLoggingConfig = (environment?: string): LoggingConfig => {
  const env = environment || process.env.NODE_ENV || 'development';
  const envConfig = loggingConfigs[env] || {};
  
  return {
    ...defaultLoggingConfig,
    ...envConfig,
    transports: {
      ...defaultLoggingConfig.transports,
      ...envConfig.transports,
    },
    rotation: {
      ...defaultLoggingConfig.rotation,
      ...envConfig.rotation,
    },
    retention: {
      ...defaultLoggingConfig.retention,
      ...envConfig.retention,
    },
    correlation: {
      ...defaultLoggingConfig.correlation,
      ...envConfig.correlation,
    },
    security: {
      ...defaultLoggingConfig.security,
      ...envConfig.security,
    },
  };
};

// Utility function to mask sensitive data
export const maskSensitiveData = (data: any, sensitiveFields: string[]): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map((item: any) => maskSensitiveData(item, sensitiveFields));
  }
  
  const masked = { ...data };
  
  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();
    
    // Check if the key is sensitive
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value as any, sensitiveFields);
    }
  }
  
  return masked;
};

// Validate log configuration
export const validateLoggingConfig = (config: LoggingConfig): string[] => {
  const errors: string[] = [];
  
  // Check log level
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  if (!validLevels.includes(config.level)) {
    errors.push(`Invalid log level: ${config.level}. Must be one of: ${validLevels.join(', ')}`);
  }
  
  // Check rotation settings
  if (config.rotation.enabled) {
    if (config.rotation.maxFiles < 1) {
      errors.push('Log rotation maxFiles must be at least 1');
    }
    
    if (!config.rotation.maxSize.match(/^\d+[kmg]?$/i)) {
      errors.push('Log rotation maxSize must be in format like "10m", "100k", "1g"');
    }
  }
  
  // Check retention settings
  if (config.retention.days < 1) {
    errors.push('Log retention days must be at least 1');
  }
  
  if (config.retention.maxFiles < 1) {
    errors.push('Log retention maxFiles must be at least 1');
  }
  
  return errors;
};

export default getLoggingConfig;