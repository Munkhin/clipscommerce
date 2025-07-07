# Workflow: Debugging and Fixing a Bug (Agentic & Hypothesis-Driven)

**Objective:** To identify, fix, and verify a bug using a scientific, hypothesis-driven, and iterative process.

**Persona:** AI Software Engineer

**Model:** Gemini 1.5 Pro (or newer)

---

### **Phase 1: Investigation & Hypothesis Formation**

1.  **User Request:** "There is a bug when I [describe the action]. The expected behavior is [describe expectation], but instead [describe the bug]."

2.  **Agent Action (Information Gathering):**
    *   **`search_file_content` / `glob`**: Search for keywords from the bug report to identify relevant files.
    *   **`read_many_files`**: Read the identified files to understand the context and logic.

3.  **Agent Action (Hypothesis Formulation):**
    *   **Critique & Analyze:** Based on the code, form a specific, testable hypothesis about the cause of the bug.
    *   **Formulate Hypothesis:** "My hypothesis is that the bug is caused by [specific, precise cause]. For example, 'the `calculateTotal` function fails to initialize the total to 0, leading to a `NaN` result when the cart is empty.'"
    *   **State Intent:** "I will now write a failing test to prove this hypothesis."

### **Phase 2: Prove Hypothesis via a Failing Test**

1.  **Agent Action (Test Creation):**
    *   Identify the most appropriate test file (or create one).
    *   **`replace`**: Add a new `test` block that creates the exact conditions for the hypothesized bug and asserts the correct behavior.

2.  **Agent Action (Hypothesis Validation):**
    *   **`run_shell_command`**: Run the newly created test.
    *   **Analyze Result:**
        *   **If it fails as expected:** "The test failed as predicted. My hypothesis is correct. I will now proceed with a fix."
        *   **If it passes (or fails for a different reason):** "The test did not fail as expected. My hypothesis was incorrect. I will re-analyze the code to form a new hypothesis."
        *   **Return to Phase 1** if the hypothesis is wrong.

### **Phase 3: Iterative Fixing & Verification**

1.  **Agent Action (Targeted Fix):**
    *   With a proven hypothesis and a failing test, perform a targeted **`replace`** operation on the source code to implement the fix.

2.  **Agent Action (Verification Loop):**
    *   **`run_shell_command`**: Re-run the specific test that was failing.
    *   **Analyze Result:**
        *   **If it passes:** "The test now passes. The fix was successful. I will now run broader checks for regressions."
        *   **If it still fails:** "The fix was incomplete or incorrect. I will analyze the failure and attempt a new fix."
        *   **Repeat** the fix/verify loop until the test passes.

3.  **Agent Action (Regression & Quality Check):**
    *   **`run_shell_command`**: Run all tests for the affected module (e.g., `npm test -- src/__tests__/components/`).
    *   **`run_shell_command`**: `npm run lint`
    *   **`run_shell_command`**: `npm run build`

### **Phase 4: Reflection & Root Cause Analysis**

1.  **Agent Action (Post-Mortem Analysis):**
    *   **Self-Correction/Critique:** "The fix is verified. What was the root cause of this bug? Was it a misunderstanding of an API, a logical flaw, or a missing edge case?"

2.  **Agent Action (Proactive Prevention):**
    *   **Formulate Query:** Based on the root cause, formulate a search pattern to find similar problematic code elsewhere.
    *   **`search_file_content`**: Execute the search.
    *   **Report Findings:** "The root cause was [cause]. I have searched the codebase and found [N] other locations that might have a similar issue. Would you like me to investigate them?"

---

**Rationale for this Agentic Workflow:**

*   **Scientific Method:** The `Hypothesize -> Prove -> Fix` loop is a rigorous and efficient way to debug, reducing guesswork.
*   **Reduces Hallucination:** By forcing the agent to prove its hypothesis with a failing test, it can't simply guess at a fix. The test provides a ground truth.
*   **Iterative Correction:** The workflow explicitly includes loops for when a fix doesn't work or a hypothesis is wrong, mirroring a human developer's process.
*   **Proactive Value-Add:** The final "Reflection" phase allows the agent to go beyond just fixing the immediate bug and helps improve overall code quality by identifying systemic issues.