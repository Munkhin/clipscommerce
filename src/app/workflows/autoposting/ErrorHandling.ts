export async function withExponentialBackoff<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 500): Promise<T> {
  let attempt = 0;
  let delay = initialDelay;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
      attempt++;
    }
  }
}

export function logError(error: any, context?: string) {
  // TODO: Implement detailed error logging (e.g., to file, DB, or monitoring service)
  console.error(`[Error]${context ? ' [' + context + ']' : ''}:`, error);
}

export function notifyAdmin(error: any, context?: string) {
  // TODO: Implement admin notification (e.g., email, Slack, etc.)
  console.warn(`[Admin Notification]${context ? ' [' + context + ']' : ''}:`, error);
} 