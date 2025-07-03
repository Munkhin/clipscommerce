
export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  userAgent?: string;
  clientIp?: string;
  method?: string;
  url?: string;
  hasAuth?: boolean;
  [key: string]: any;
}
