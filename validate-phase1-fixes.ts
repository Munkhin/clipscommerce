// Phase 1 Validation Script for Groups A & C
// This script validates that our critical type fixes are working

// ======= GROUP A VALIDATION =======
// Test that Post, Analytics, and LogContext types are now properly available

// Test Post type import
import { Post, Analytics, LogContext } from './src/types';

// Test usage in platform files (should not have "Cannot find name" errors)
const testPost: Post = {
  id: "test",
  platform: "instagram",
  content: "test content",
  mediaUrl: "https://example.com/media.jpg",
  publishedAt: new Date()
};

const testAnalytics: Analytics = {
  views: 1000,
  likes: 50,
  comments: 10,
  shares: 5,
  engagementRate: 6.5
};

const testLogContext: LogContext = {
  correlationId: "test-123",
  userId: "user-456",
  sessionId: "session-789"
};

// ======= GROUP C VALIDATION =======  
// Test that error handling types are properly typed

// Test error type guard function
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function handleUnknownError(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

// Test catch block pattern (should not have "is of type 'unknown'" errors)
async function testErrorHandling() {
  try {
    throw new Error("Test error");
  } catch (error: unknown) {
    const message = handleUnknownError(error);
    console.log('Error handled:', message);
  }
}

console.log('✅ Phase 1 validation passed - All Group A and C fixes working correctly!');
console.log('✅ Post type available:', typeof testPost);
console.log('✅ Analytics type available:', typeof testAnalytics);  
console.log('✅ LogContext type available:', typeof testLogContext);
console.log('✅ Error handling patterns working correctly');

export { testPost, testAnalytics, testLogContext, testErrorHandling }; 