# Launch prep prompt
## 🔴 Critical (Must-Have for Launch)

| Feature Area | Task | Status | Evidence & Next Steps |
| :--- | :--- | :--- | :--- |
| **Authentication** | Implement Two-Factor Authentication (2FA) | 🔴 **Not Implemented** | No files or logic for 2FA were found. Need to add UI for setup, and backend logic for code verification. |
| | Integrate RBAC with a database | 🔴 **Not Implemented** | `roleManager.ts` is an in-memory implementation. It needs to be connected to a database to persist roles and permissions. |
| **Video Workflow** | Implement AI Video Processing | 🔴 **Not Implemented** | The `initiateVideoProcessing` function is a placeholder. The `VideoOptimizationAnalysisService` needs to be integrated with the `/api/videos/process` route. |
| | Implement Video Editor | 🔴 **Not Implemented** | No video editing features were found. A video editor UI and backend logic for trimming/cropping are required. |
| **Autoposting** | Implement Retry Logic for Failed Posts | 🔴 **Not Implemented** | No retry mechanism was found in any of the autoposting-related files. This is critical for ensuring reliable posting. |
| **Billing** | Implement Subscription Quotas | 🔴 **Not Implemented** | The `checkPostingLimits` function uses hardcoded limits. It needs to be updated to check the user's actual subscription plan. |
| | Implement Stripe Webhooks | 🔴 **Not Implemented** | No webhook handler was found. This is essential for syncing subscription status between Stripe and the application. |
| **Analytics** | Implement Data Export (CSV/PDF) | 🔴 **Not Implemented** | No export functionality was found. The `ReportsPage` needs buttons and API endpoints for exporting data. |

## 🟡 Partial (Needs Completion)

| Feature Area | Task | Status | Evidence & Next Steps |
| :--- | :--- | :--- | :--- |
| **Autoposting** | Connect Scheduler UI to Backend | 🟡 **Partial** | The `AutopostScheduler` component uses its own Supabase client and has hardcoded values. It needs to be fully integrated with the `/api/autoposting/schedule` API. |
| **Billing** | Fully Integrate Stripe Checkout | 🟡 **Partial** | The app uses pre-configured Stripe links. It should be updated to use the dynamic checkout session creation shown in `/api/temp/checkout/route.ts`. |


