# Skill: Refactoring

## Purpose
Suggest and implement code refactoring to improve the performance, maintainability, and correctness of mcp-load-test components. Special focus on histogram precision, session pool efficiency, and pattern engine throughput.

## Triggers
- "Refactor this code"
- "Improve performance"
- "Clean up this module"
- "Optimize the histogram"
- "Session pool efficiency"
- "Reduce memory allocations"
- When user requests code improvements or identifies performance bottlenecks

## Capabilities
- **Histogram Optimization**: Improve bucket sizing, reduce memory footprint, and optimize percentile calculations in `@reaatech/mcp-load-test-metrics`
- **Session Pool Efficiency**: Refactor session creation, reuse, and cleanup for minimal overhead under high concurrency in `@reaatech/mcp-load-test-engine`
- **Pattern Engine Performance**: Simplify pattern execution, reduce async overhead between steps in `@reaatech/mcp-load-test-patterns`
- **Transport Layer Refactoring**: Extract common transport logic, reduce code duplication between HTTP/SSE/stdio in `@reaatech/mcp-load-test-client`
- **Metrics Collection Optimization**: Minimize object allocation in the hot path of `MetricsCollector.record()`
- **Type Safety Improvements**: Strengthen TypeScript types in `@reaatech/mcp-load-test-core`, eliminate `any` usage, improve Zod schema design
- **Memory Leak Prevention**: Ensure sessions, transports, timers, and AbortControllers are properly disposed

## Constraints
- Must preserve existing load test behavior and statistical accuracy
- Should maintain or improve test coverage
- Changes should be incremental and reviewable
- Must pass biome lint (strict: noNonNullAssertion, noExplicitAny) and tsc typecheck
- Should consider backward compatibility for library API consumers

## Examples
- "Refactor the histogram to use a fixed-size array for bucket counts"
- "Optimize session pool creation to avoid blocking the event loop"
- "Extract common retry logic from all three transport implementations"
- "Reduce object allocations in the per-request metrics hot path"
- "Refactor the pattern executor to use a state machine instead of nested async loops"
- "Improve the grading system to support per-tool-category benchmarks"
