# Gemini Project Brief: clipscommerce

This document provides a high-level overview of the `clipscommerce` project to guide development and ensure consistency.

## 1. Core Technologies

*   **Framework:** Next.js (v14)
*   **Language:** TypeScript
*   **UI Framework:** React
*   **Styling:** Tailwind CSS with shadcn/ui components.
*   **Database & Auth:** Supabase (PostgreSQL)
*   **Testing:**
    *   **Unit/Integration:** Jest with React Testing Library
    *   **E2E:** Playwright
*   **Linting:** ESLint
*   **Containerization:** Docker
*   **Deployment:** Vercel & Docker

## 2. Project Structure

*   **`src/app`**: Main application code, following the Next.js App Router structure.
    *   **`src/app/api`**: API routes.
    *   **`src/app/dashboard`**: User dashboard section.
*   **`src/components`**: Reusable React components (likely shadcn/ui).
*   **`src/lib`**: Utility functions and libraries.
*   **`src/services`**: Business logic and external service integrations (e.g., TikTok).
*   **`supabase`**: Supabase client, migrations, and queries.
*   **`e2e`**: End-to-end tests written with Playwright.
*   **`src/__tests__`**: Unit and integration tests for components and services.

## 3. Key Features

*   **User Authentication:** Handled via Supabase Auth.
*   **Dashboard:** Main user interface for interacting with the application.
*   **AI/ML Features:** Core functionality involving AI.
*   **Autoposting:** Automated content posting capabilities.
*   **TikTok Integration:** Interacts with the TikTok API.
*   **Payments:** Likely integrated with a payment provider like Stripe.

## 4. Development Workflow

*   **Installation:** `npm install`
*   **Running Dev Server:** `npm run dev`
*   **Running Tests:**
    *   `npm test` (for Jest tests)
    *   `npx playwright test` (for Playwright E2E tests)
*   **Linting:** `npm run lint`
*   **Building for Production:** `npm run build`

## 5. Coding Conventions

*   Adhere to the existing ESLint configuration (`.eslintrc.json`).
*   Use TypeScript for all new code.
*   Follow the existing file and component structure.
*   Write tests for new features.
