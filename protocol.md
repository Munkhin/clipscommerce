Protocol: Complete Vercel Build Resolution

  Objective

  Complete remaining TypeScript build errors with minimal token usage and maximum runtime efficiency.

  Error Pattern Analysis

  - Type A: error.message on unknown error objects (7+ instances)
  - Type B: Platform type inconsistencies (3+ instances)

  Execution Strategy

  Phase 1: Bulk Error Identification (Single Agent)

  AGENT: "Find all error.message issues"
  TASK: Search entire codebase for `error.message` usage patterns
  OUTPUT: Complete list with file:line references
  CONSTRAINT: Single comprehensive search, not file-by-file

  Phase 2: Parallel Bulk Fixes (2 Agents)

  AGENT A: "Fix all error.message issues"
  TASK: Apply standard pattern to all identified instances
  PATTERN: error instanceof Error ? error.message : String(error)
  METHOD: Use MultiEdit for batch operations per file

  AGENT B: "Fix Platform type mismatches"
  TASK: Search and fix remaining Platform type inconsistencies
  FOCUS: Object keys, array values, type annotations
  METHOD: Search-then-fix approach

  Guardrails

  ❌ PROHIBITED ACTIONS

  - Individual file deployments
  - Reactive error fixing (deploy → see error → fix)
  - Sequential file processing
  - Reading files without specific error targets

  ✅ REQUIRED PATTERNS

  - Batch search before any edits
  - Commit fixes in logical groups
  - Single final deployment after all fixes
  - Use MultiEdit for multiple changes per file

  Verification Protocol

  1. Pre-deployment: Local TypeScript compilation check
  2. Single deployment: After all fixes complete
  3. Success criteria: Build completes with exit code 0

  Token Optimization

  - Search Strategy: Use grep/rg for pattern matching
  - Edit Strategy: MultiEdit for multiple changes
  - Agent Coordination: Parallel execution where possible
  - Deployment Strategy: One final attempt only

  Estimated Timeline

  - Phase 1: 2-3 tool calls
  - Phase 2: 4-6 tool calls (parallel)
  - Verification: 1-2 tool calls
  - Total: <10 tool calls to completion