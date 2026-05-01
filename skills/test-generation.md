# Skill: Test Generation

## Purpose
Generate comprehensive test cases for mcp-load-test components, including unit tests for the engine, integration tests with mock MCP servers, and transport-layer mocking.

## Triggers
- "Generate tests"
- "Write test cases"
- "Test this transport"
- "Mock MCP server"
- "Add test coverage"
- "How should I test this pattern?"
- When user requests testing assistance for load-test components

## Capabilities
- **Unit Test Generation**: Create tests for load engine, session manager, profile generators, histograms, pattern executors, and reporters
- **Mock MCP Server Design**: Build lightweight mock servers that simulate realistic tool responses and transport behavior (used by `@reaatech/mcp-load-test-engine` and `@reaatech/mcp-load-test-cli` integration tests)
- **Transport Mocking**: Create test doubles for StreamableHTTP, SSE, and stdio transports in `@reaatech/mcp-load-test-client`
- **Pattern Testing**: Verify pattern executors in `@reaatech/mcp-load-test-patterns` handle step failures, think time, and state passing correctly
- **Integration Test Design**: Design tests for end-to-end load test scenarios with controlled failure injection
- **Edge Case Identification**: Identify boundary conditions in concurrency levels, timing, and error rates
- **Coverage Analysis**: Suggest tests to improve code coverage toward the 80% threshold (per-package vitest config)

## Constraints
- Cannot execute tests to verify they pass (but tests are runnable via `pnpm test`)
- Tests use Vitest 4 with TypeScript 6
- Should consider the project's concurrent and timing-sensitive nature
- Generated tests may need manual adjustments for timing-dependent assertions
- Each package has its own `vitest.config.ts` and `tests/` directory

## Examples
- "Generate unit tests for the RampProfile generator in @reaatech/mcp-load-test-profiles"
- "Create a mock MCP server that returns 429 after 50 requests"
- "Write integration tests for the SSE transport reconnection logic in @reaatech/mcp-load-test-client"
- "Add edge case tests for histogram percentile calculation with empty buckets"
- "Generate tests for pattern abort behavior when a step times out"
- "Design a test for breaking point detection with gradual degradation in @reaatech/mcp-load-test-analysis"
