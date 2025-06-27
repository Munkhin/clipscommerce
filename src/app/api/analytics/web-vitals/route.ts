import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();
    
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