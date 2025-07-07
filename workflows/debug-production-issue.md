# Workflow: Debugging a Production Issue

This workflow provides a structured approach to debugging issues encountered in the production environment.

## 1. Gather Information

*   **Identify the symptoms:** What is the user experiencing? When did it start? Is it reproducible?
*   **Check logs:** Access production logs (e.g., Vercel logs, Supabase logs, server logs) for error messages, stack traces, or unusual activity around the time the issue occurred.
*   **Monitor metrics:** Review application performance monitoring (APM) tools, database metrics, and server resource usage for anomalies.
*   **User reports:** Collect detailed information from bug reports, including steps to reproduce, screenshots, and affected user IDs.

## 2. Reproduce Locally (if possible)

*   **Mimic production environment:** Try to replicate the production environment as closely as possible (e.g., same Node.js version, environment variables, database state).
*   **Isolate the issue:** Narrow down the problem to a specific component, function, or data interaction.
*   **Use production data (anonymized):** If safe and legal, use anonymized production data to reproduce the issue.

## 3. Analyze and Diagnose

*   **Agent 1: Code Review & Recent Changes**
    *   Examine the relevant code paths identified in step 2.
    *   Look for recent changes that might have introduced the bug.
    *   Identify edge cases or potential race conditions in the code.
    *   Use `git blame` or `git log` to pinpoint recent commits affecting the problematic code.
*   **Agent 2: Deep Dive with Debugging Tools**
    *   Utilize your IDE's debugger to step through the code execution flow.
    *   Insert `console.log` (or equivalent) statements strategically to inspect variable values and execution paths.
    *   For frontend issues, leverage browser developer tools (console, network, elements, performance tabs) to diagnose UI/UX problems, network requests, and rendering issues.
    *   For backend issues, analyze server logs and consider temporary verbose logging for more insights.
*   **Agent 3: Formulate and Validate Hypothesis**
    *   Based on the gathered information and debugging efforts, formulate a clear hypothesis about the root cause of the issue.
    *   Consider alternative hypotheses and how to rule them out.
    *   If possible, devise a minimal test case or a small code snippet that isolates and reproduces the hypothesized bug.

## 4. Develop a Fix

*   **Implement the fix:** Write code to address the identified root cause.
*   **Consider side effects:** Ensure your fix doesn't introduce new bugs or regressions.
*   **Write tests:** Create new unit or integration tests to cover the specific bug and prevent its recurrence.

## 5. Test and Verify

*   **Run all tests:** Execute unit, integration, and E2E tests to ensure the fix works and no regressions were introduced.
    ```bash
    npm test
    npx playwright test
    ```
*   **Manual testing:** Perform thorough manual testing, especially focusing on the affected functionality and related areas.
*   **Staging environment:** Deploy the fix to a staging or pre-production environment for final verification before deploying to production.

## 6. Deploy and Monitor

*   **Deploy the fix:** Carefully deploy the fix to the production environment.
*   **Monitor:** Closely monitor logs, metrics, and user feedback after deployment to confirm the issue is resolved and no new problems arise.
*   **Post-mortem (optional but recommended):** If the issue was severe, conduct a post-mortem analysis to understand what went wrong, how to prevent similar issues in the future, and document lessons learned.
