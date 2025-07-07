# Workflow: Refactoring Code (Agentic & Iterative)

**Objective:** To safely refactor a piece of the codebase to improve its structure, readability, or performance without altering its external behavior, using a methodical, iterative process.

**Persona:** AI Software Engineer

**Model:** Gemini 1.5 Pro (or newer)

---

### **Phase 1: Pre-computation & Safety Analysis**

1.  **User Request:** "Refactor the `[ComponentName]` component to [improve some quality, e.g., use a new hook, simplify state management]."

2.  **Agent Action (Code & Test Review):**
    *   **`read_file`**: Read the component/service to be refactored.
    *   **`read_file`**: Read the corresponding test file.
    *   **Analyze Coverage (Self-Critique):** "I have reviewed the code and its tests. The current test suite covers [X, Y, Z] but seems to be missing coverage for [A, B]. A safe refactor requires a comprehensive test suite."

3.  **Agent Action (Plan Formulation & Test Enhancement):**
    *   **Formulate Plan:** "I will first strengthen the test suite to cover these gaps. Then, I will refactor the component in the following small steps: [Step 1: Extract function], [Step 2: Replace state management], [Step 3: Clean up]. I will run tests after each step."
    *   **Seek Approval:** "Does this plan look correct?"
    *   **`replace`**: Upon approval, add the necessary tests to the test file.
    *   **`run_shell_command`**: `npm test -- [test_file_path]`. Confirm all tests pass before proceeding. This is the safety baseline.

### **Phase 2: The Iterative Refactoring Loop**

This is a micro-cycle for each step in the refactoring plan.

1.  **Agent Action (Execute One Refactoring Step):**
    *   **`replace`**: Apply **only the first** planned refactoring step. For example, just extract a function into a pure utility.

2.  **Agent Action (Immediate Verification):**
    *   **`run_shell_command`**: `npm test -- [test_file_path]`.
    *   **Analyze Result:**
        *   **If tests pass:** "Step 1 was successful. The tests still pass. I will now proceed to Step 2."
        *   **If tests fail:** "This step introduced a failure. I will revert the change, analyze the error, and re-attempt the step differently."
        *   The agent should loop on this step until it can perform the refactoring without breaking the tests.

3.  **Repeat:** Continue this `Execute -> Verify` loop for every step in the plan.

### **Phase 3: Finalization & Holistic Verification**

1.  **Agent Action (Code Cleanup):**
    *   Once all refactoring steps are complete, there may be dead code (old functions, unused imports).
    *   **`replace`**: Perform a final pass to remove this dead code.
    *   **`run_shell_command`**: Re-run the local tests one last time to ensure the cleanup didn't break anything.

2.  **Agent Action (Full System Check):**
    *   **`run_shell_command`**: `npm test` (run the *entire* test suite to check for unintended side-effects).
    *   **`run_shell_command`**: `npm run lint`
    *   **`run_shell_command`**: `npm run build`
    *   Fix any issues that arise from this holistic check.

3.  **Agent Action (Final Critique):**
    *   **Self-Critique:** "The refactoring is complete and verified. Does the new code achieve the user's goal? Is it significantly cleaner/more performant? Are there any further improvements that could be made?"

---

**Rationale for this Agentic Workflow:**

*   **Safety First:** The workflow's primary concern is safety. It starts by ensuring a strong test harness is in place *before* making any changes.
*   **Incrementalism:** Refactoring is done in small, verifiable steps defined in a plan. This dramatically reduces the risk of introducing bugs and makes it easier to pinpoint the source of any errors.
*   **No Behavior Change:** The workflow is designed to ensure that the *external behavior* of the component does not change. The tests are the contract that must be honored.
*   **Structured & Predictable:** The `Plan -> Execute -> Verify` cycle makes the agent's process transparent and predictable.
*   **Reduces Risk:** By running tests after every small change, the agent catches errors at the earliest possible moment, preventing complex, hard-to-debug failures.