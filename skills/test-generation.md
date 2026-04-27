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
- **Unit Test Generation**: Create tests for load engine, session manager, profile executors, and histograms
- **Mock MCP Server Design**: Build lightweight mock servers that simulate realistic tool responses and transport behavior
- **Transport Mocking**: Create test doubles for StreamableHTTP, SSE, and stdio transports
- **Pattern Testing**: Verify pattern executors handle step failures, think time, and state passing correctly
- **Integration Test Design**: Design tests for end-to-end load test scenarios with controlled failure injection
- **Edge Case Identification**: Identify boundary conditions in concurrency levels, timing, and error rates
- **Coverage Analysis**: Suggest tests to improve code coverage toward the 80% threshold

## Constraints
- Cannot execute tests to verify they pass
- May need clarification on Vitest-specific preferences
- Should consider the project's concurrent and timing-sensitive nature
- Generated tests may need manual adjustments for timing-dependent assertions

## Examples
- "Generate unit tests for the RampProfile executor"
- "Create a mock MCP server that returns 429 after 50 requests"
- "Write integration tests for the SSE transport reconnection logic"
- "Add edge case tests for histogram percentile calculation with empty buckets"
- "Generate tests for pattern abort behavior when a step times out"
- "Design a test for breaking point detection with gradual degradation"
