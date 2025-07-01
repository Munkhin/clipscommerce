# Parallel Debugging Instructions Checklist

This checklist is segmented by file and error type. Each group can be assigned to a separate agent for efficient, isolated fixes.

---

## 1. Platform Client Implementation Errors
- [ ] Implement all abstract members from `BasePlatformClient` in:
  - `src/app/workflows/data_collection/lib/platforms/instagram-client.ts`
    - `listUserVideos`
    - `fetchPosts` (signature mismatch)
    - `uploadContent` (signature mismatch)
    - `getAnalytics` (signature mismatch)
    - Add missing properties: `requestQueue`
    - Import or define: `ApiError`, `PlatformError`, `RateLimitError`
  - `src/app/workflows/data_collection/lib/platforms/instagram.ts`
    - `listUserVideos`
    - Fix: `reset` property expects a `number`, not `Date`
    - Fix: `authTokenManager.getToken` does not exist
  - `src/app/workflows/data_collection/lib/platforms/tiktok-client.ts`
    - `listUserVideos`
    - Fix: `reset` property expects a `number`, not `Date`
  - `src/app/workflows/data_collection/lib/platforms/platform-factory.ts`
    - `TikTokClient` and `YouTubeClient` missing required methods

---

## 2. Type Mismatches & Enum Issues
- [ ] Fix enum/case mismatches:
  - `src/app/workflows/reports/ReportsAnalysisService.ts`
    - `Platform.TIKTOK`, `Platform.INSTAGRAM`, `Platform.YOUTUBE` not assignable to string union
- [ ] Fix property assignment mismatches:
  - `src/lib/services/analyticsService.ts`
    - `bestPerformingPost`/`worstPerformingPost` type issues and missing properties

---

## 3. Missing Imports/Properties/Types
- [ ] Add missing imports or define missing types:
  - `src/components/dashboard/AccelerateComponent.tsx`
    - `handleRetryVideo`, `handleRemoveVideo`
  - `src/components/team-dashboard/modules/index.ts`
    - `VideoFile`
  - `src/lib/ai/contentOptimizer.ts`
    - `Platform` import
  - `src/lib/services/queueService.ts`
    - Add required `platform` property to `PlatformAuth`
  - `src/lib/storage/cleanup-service.ts`
    - Use `createClient` instead of `createServerClient`
  - `src/instrumentation/telemetry.ts`
    - Add all missing OpenTelemetry imports/types

---

## 4. Type Narrowing & Guards
- [ ] Add type guards or casts for:
  - `src/instrumentation/telemetry.ts`
    - `error` and `span` are of type `unknown`
    - `activeSpan.getAttribute` does not exist
    - Spread types from non-object
  - `src/lib/accessibility/accessibilityAuditor.ts`
    - Object possibly `undefined`
    - Return type mismatch in `check`
    - Event listener parameter types
  - `src/lib/ai/engagementPredictor.ts`, `src/lib/ai/enhancedTextAnalyzer.ts`, `src/lib/ai/visualAnalyzer.ts`
    - Type guards for cache returns and property assignments

---

## 5. Signature/Return Type Issues
- [ ] Fix function signatures to match expected types:
  - `src/app/workflows/reports/ChartGenerator.ts`
    - Use `export type` for types with `isolatedModules`
  - `src/lib/security/auth-guard.ts`
    - `RequestBody | null` not assignable to `RequestBody`
    - `UserProfile | null` not assignable to `UserProfile | undefined`
    - `rule` is `never` type
  - `src/lib/security/inputSanitizer.ts`
    - `createDOMPurify` does not exist on `dompurify`
  - `src/lib/security/validationMiddleware.ts`
    - Assigning string to `Record<string, unknown>`

---

## 6. Array/Union/Optional Type Issues
- [ ] Filter or cast arrays to correct types:
  - `src/services/contentInsightsService.ts`
    - Capitalize day names for enum
    - Filter undefined from caption arrays
    - Add `duration` to `ContentData`
  - `src/middleware/correlation.ts`
    - Narrow `string | string[]` to `string`
  - `src/services/autoposting.ts`
    - Add required `status` property to `metadata`
  - `src/lib/services/schedulingService.ts`
    - `Post[]` not assignable to expected array type

---

## 7. Testing/Utils Import Errors
- [ ] Fix testing utility imports:
  - `testing/utils/index.tsx`
    - Use correct imports for `screen`, `fireEvent`, `waitFor` from `@testing-library/react`

---

## 8. Buffer/Uint8Array/Node Compatibility
- [ ] Fix Buffer/Uint8Array issues:
  - `src/services/secureTransfer.ts`
    - Use correct types for crypto and buffer operations

---

Assign each group to a parallel agent for efficient debugging.
Check off each item as it is resolved.

Let a maintainer know if you want code snippets for any specific group!
