# Workflow: Add a New API Endpoint

This workflow outlines the steps to add a new API endpoint in the Next.js application.

## 1. Create the API Route File

Create a new file for your API route under `src/app/api/`. The file name should be `route.ts` within a directory that defines your endpoint path.

**Example:** For an endpoint `/api/my-new-endpoint`, create `src/app/api/my-new-endpoint/route.ts`.

```typescript
// src/app/api/my-new-endpoint/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Handle GET request logic here
  return NextResponse.json({ message: 'Hello from new API endpoint!' });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Handle POST request logic here
  return NextResponse.json({ message: 'Data received', data: body });
}

// Add other HTTP methods (PUT, DELETE, etc.) as needed.
```

## 2. Implement Logic

Add your specific business logic within the respective HTTP method functions (e.g., `GET`, `POST`). This might involve:
*   Interacting with the Supabase client (`supabase/client.ts`).
*   Calling utility functions from `src/lib`.
*   Using services from `src/services`.

## 3. Add Tests (Recommended)

Create corresponding unit or integration tests for your new API endpoint in `src/__tests__/api/` or a relevant subdirectory.

**Example:** For `src/app/api/my-new-endpoint/route.ts`, create `src/__tests__/api/my-new-endpoint.test.ts`.

Run tests:
```bash
npm test src/__tests__/api/my-new-endpoint.test.ts
```

## 4. Run Linting and Type-Checking

Ensure your new code adheres to project standards and has no type errors.

```bash
npm run lint
npm run build # This also performs type-checking
```

## 5. Verify Functionality

Run the development server and test your new API endpoint using tools like Postman, Insomnia, or `curl`.

```bash
npm run dev
```