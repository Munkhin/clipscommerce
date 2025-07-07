# Workflow: Adding a New API Route (Iterative & Agentic)

**Objective:** To create a new, tested, and documented API endpoint in `src/app/api` using an iterative, self-correcting process.

**Persona:** AI Software Engineer

**Model:** Gemini 1.5 Pro (or newer)

---

### **Phase 1: Planning & Scaffolding**

1.  **User Request:** "Create a new API route at `/api/[route-name]` for `[HTTP-Method]` requests to [purpose]."

2.  **Agent Action (Plan Formulation):**
    *   **Analyze Request:** Deconstruct the purpose into data inputs, outputs, and potential side-effects (e.g., database writes).
    *   **Formulate Plan:** "I will create the `/api/[route-name]` endpoint. The `[HTTP-Method]` handler will expect `[data structure]` in the request body/query. It will then `[perform action]` and return a `[status code]` with `[response structure]`. I will create a test file to validate this behavior."
    *   **Seek Approval:** "Is this plan correct?"

3.  **Agent Action (Initial Scaffolding):**
    *   Upon approval:
        *   `mkdir -p src/app/api/[route-name]`
        *   `touch src/app/api/[route-name]/route.ts`
        *   `touch src/__tests__/api/[route-name].test.ts`

4.  **Agent Action (Boilerplate Generation):**
    *   **`read_file`**: Read an existing, similar route (e.g., `src/app/api/auth/callback/route.ts`) for conventions.
    *   **`write_file`**: Write boilerplate to `src/app/api/[route-name]/route.ts`.
    *   **`write_file`**: Write boilerplate to `src/__tests__/api/[route-name].test.ts`, including imports and a placeholder test.

### **Phase 2: Iterative Development Cycle (Test -> Implement -> Refine)**

This loop is performed for each distinct piece of logic (e.g., input validation, database query, final response).

1.  **Agent Action (Write a Failing Test):**
    *   **`replace`**: Add a new, specific, and **failing** test to `src/__tests__/api/[route-name].test.ts`. This test should define a clear success criterion (e.g., "returns a 400 if email is invalid").
    *   **`run_shell_command`**: `npm test -- src/__tests__/api/[route-name].test.ts`. Confirm the test fails as expected.

2.  **Agent Action (Implement to Pass Test):**
    *   **`replace`**: Write the minimal amount of code in `src/app/api/[route-name]/route.ts` to make the failing test pass.
    *   **`run_shell_command`**: `npm test -- src/__tests__/api/[route-name].test.ts`. Confirm the test now passes.

3.  **Agent Action (Refinement & Self-Correction):**
    *   **Critique:** "Is the new code clear? Does it handle all edge cases for this specific feature? Does it align with the project's error handling strategy?"
    *   If improvements are needed, **`replace`** the code and re-run the tests.

4.  **Repeat:** Continue the loop for all success and error-handling logic paths.

### **Phase 3: Final Verification & Documentation**

1.  **Agent Action (Holistic Verification):**
    *   **`run_shell_command`**: `npm run lint`. Fix any issues.
    *   **`run_shell_command`**: `npm run build`. Fix any issues.

2.  **Agent Action (Documentation):**
    *   **Self-Correction:** "Now that the route is complete and tested, the documentation needs to be created/updated."
    *   **`write_file`**: Create or update a markdown file in `src/app/api-docs/` describing the endpoint, its parameters, authentication requirements, and providing example request/response payloads.

---

**Rationale for this Agentic Workflow:**

*   **Clarity Through Tests:** The TDD cycle forces the agent to define success for a piece of logic *before* implementing it, which is a powerful way to ensure correctness.
*   **Iterative Implementation:** Building the route piece-by-piece (validation, data fetching, response) is more robust than generating the entire handler at once.
*   **Embedded Quality Checks:** The self-correction prompts and integrated linting/building ensure that quality is not an afterthought.
*   **Proactive Documentation:** The agent is prompted to create documentation as a final step, ensuring the project stays maintainable.