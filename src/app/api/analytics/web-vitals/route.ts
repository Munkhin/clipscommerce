import { NextRequest, NextResponse } from 'next/server';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

const inputValidator = createValidator({
  name: [validators.required, validators.string, validators.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'])],
  value: [validators.required, validators.number],
  rating: [validators.required, validators.string, validators.enum(['good', 'needs-improvement', 'poor'])],
  delta: [validators.required, validators.number],
  id: [validators.required, validators.string]
});

export async function POST(request: NextRequest) {
  // Apply security guard with rate limiting and input validation (no auth required for web vitals)
  const guardResult = await authGuard(request, {
    requireAuth: false,
    requireCsrf: false,
    rateLimit: {
      identifier: 'web-vitals',
      requests: 50,
      window: '1m'
    },
    validateInput: inputValidator
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  try {
    const metric = guardResult.context!.body;
    
    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        timestamp: new Date().toISOString(),
      });
    }

    // In production, you would send this to your analytics service
    // Examples:
    // - Google Analytics 4
    // - Vercel Analytics
    // - Custom analytics database
    
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Google Analytics 4
      // await fetch('https://www.google-analytics.com/mp/collect', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     client_id: metric.id,
      //     events: [{
      //       name: 'web_vitals',
      //       params: {
      //         metric_name: metric.name,
      //         metric_value: metric.value,
      //         metric_rating: metric.rating,
      //       }
      //     }]
      //   })
      // });

      // Example: Store in database
      // await db.webVitals.create({
      //   data: {
      //     name: metric.name,
      //     value: metric.value,
      //     rating: metric.rating,
      //     delta: metric.delta,
      //     id: metric.id,
      //     userAgent: request.headers.get('user-agent'),
      //     timestamp: new Date(),
      //   }
      // });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vitals:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
} 