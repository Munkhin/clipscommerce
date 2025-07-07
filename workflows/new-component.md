# Workflow: Adding a New UI Component (Iterative & Agentic)

**Objective:** To add a new, tested, and styled React component to the `src/components/ui` directory using an iterative, self-correcting process.

**Persona:** AI Software Engineer

**Model:** Gemini 1.5 Pro (or newer)

---

### **Phase 1: Planning & Scaffolding**

1.  **User Request:** "Create a new component named `[ComponentName]` for [purpose]."

2.  **Agent Action (Plan Formulation):**
    *   **Analyze Request:** Deconstruct the user's request into props, state, and core logic.
    *   **Formulate Plan:** "I will create `[ComponentName]`. It will accept the following props: `[prop1, prop2]`. I will start with a basic structure and then build out the functionality for `[purpose]`. I will also create a test file to ensure it renders correctly."
    *   **Seek Approval:** "Does this plan align with your vision?"

3.  **Agent Action (Initial Scaffolding):**
    *   Upon approval, create the component and test files:
        *   `touch src/components/ui/[component-name].tsx`
        *   `touch src/__tests__/components/[component-name].test.tsx`

4.  **Agent Action (Boilerplate Generation):**
    *   **`read_file`**: Read `src/components/ui/button.tsx` to understand project conventions.
    *   **`write_file`**: Write boilerplate to `src/components/ui/[component-name].tsx` (React function, initial props).
    *   **`write_file`**: Write boilerplate to `src/__tests__/components/[component-name].test.tsx` (imports, basic render test).

### **Phase 2: Iterative Development Cycle (Implement -> Test -> Refine)**

This phase is a loop for each feature or logical unit of the component.

1.  **User Request:** "Implement `[Feature 1]` for `[ComponentName]`."

2.  **Agent Action (Test-First Implementation):**
    *   **`read_file`**: Read the current component and test file.
    *   **`replace`**: Add a new, **failing** test to `src/__tests__/components/[component-name].test.tsx` that describes `[Feature 1]`.
    *   **`run_shell_command`**: `npm test -- src/__tests__/components/[component-name].test.tsx`. **Confirm it fails for the correct reason.**

3.  **Agent Action (Implementation to Pass Test):**
    *   **`replace`**: Modify `src/components/ui/[component-name].tsx` with the minimal code required to make the new test pass.
    *   **`run_shell_command`**: `npm test -- src/__tests__/components/[component-name].test.tsx`. **Confirm all tests for the component now pass.**

4.  **Agent Action (Styling & Refinement):**
    *   **`replace`**: Apply Tailwind CSS classes to the new elements, adhering to project style.
    *   **Self-Correction/Critique:** "The feature is implemented and tested. Is the code clean? Is the naming clear? Could this be more efficient?"
    *   If improvements are identified, perform another `replace` and re-run tests.

5.  **Repeat:** Continue this loop for all requested features.

### **Phase 3: Final Verification & Integration**

1.  **Agent Action (Holistic Review):**
    *   Once all features are implemented, review the entire component.
    *   **`run_shell_command`**: `npm run lint`. Fix any issues.
    *   **`run_shell_command`**: `npm run build`. Fix any issues.

2.  **User Request:** "Integrate `[ComponentName]` into the `[PageName]` page."

3.  **Agent Action (Integration):**
    *   **`read_file`**: Read the target page file.
    *   **`replace`**: Import and add the new component to the page's JSX.

---

**Rationale for this Agentic Workflow:**

*   **Iterative Quality:** The "Implement -> Test -> Refine" loop ensures each piece of functionality is robust and well-written before moving to the next.
*   **Test-Driven by Default:** By writing a failing test first, the agent has a clear, verifiable goal for its implementation step. This reduces ambiguity and hallucinations.
*   **Self-Correction:** The explicit "Self-Correction/Critique" step prompts the agent to analyze its own code and make improvements, leading to higher-quality output.
*   **Reduced Cognitive Load:** Breaking the problem into small, testable units is more efficient and less error-prone than attempting to generate a complex component in one shot.
*   **Proactive Planning:** The initial planning phase ensures alignment with the user's intent before any code is written.