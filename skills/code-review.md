# Skill: Code Review

## Purpose
Analyze code changes in mcp-load-test with special attention to concurrency safety, session lifecycle correctness, transport-specific behavior, and performance implications.

## Triggers
- "Review this code"
- "Analyze the changes"
- "Check for race conditions"
- "Is this transport-safe?"
- "Pull request review"
- "Is this session cleanup correct?"
- When user shares code snippets or file changes

## Capabilities
- **Concurrency Safety**: Identify race conditions, shared mutable state, and improper async handling in session pools
- **Session Lifecycle Review**: Verify proper cleanup, resource disposal, and transport disconnect handling
- **Transport-Specific Logic**: Check that HTTP, SSE, and stdio transports handle errors and reconnections correctly
- **Performance Review**: Spot histogram allocation issues, unnecessary object creation under load, and blocking operations
- **Error Handling**: Verify that timeouts, transport failures, and breaking point signals are handled gracefully
- **Type Safety**: Check TypeScript strictness, unknown catch variables, and Zod schema coverage
- **Test Coverage**: Check if adequate tests exist for concurrent and timing-sensitive changes

## Constraints
- Cannot execute code to verify runtime behavior
- Analysis is limited to static code review
- May not catch all timing-dependent race conditions
- Should focus on constructive, actionable feedback

## Examples
- "Please review the session-manager.ts changes for concurrency safety"
- "Review this SSE transport fix for connection leak potential"
- "Check if the histogram implementation is allocation-efficient under high load"
- "Analyze the pattern executor for proper error propagation"
- "Review the breaking point detector for false-positive risk"
