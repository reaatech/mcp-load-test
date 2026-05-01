# Skill: Documentation

## Purpose
Generate, update, and improve mcp-load-test documentation including PR-ready reports, YAML configuration guides, architecture diagrams, and API references.

## Triggers
- "Write documentation"
- "Update the README"
- "Document this package"
- "Create config docs"
- "Write a tutorial"
- "Generate load test report"
- "Update the docs"
- When user requests documentation improvements or report generation

## Capabilities
- **Report Generation**: Create markdown load test reports with executive summary, latency tables, and recommendations using `@reaatech/mcp-load-test-reporters`
- **Package Documentation**: Document the public API, exports, and usage patterns for each of the 9 monorepo packages
- **Configuration Documentation**: Document YAML/JSON config options, CLI flags, and environment variables
- **API Documentation**: Generate API reference for programmatic load test execution via `@reaatech/mcp-load-test-engine`
- **Architecture Documentation**: Document system architecture, dependency graph, and component interactions
- **Tutorial Writing**: Create how-to guides for ramp tests, soak tests, spike tests, and custom pattern definition
- **Transport Guides**: Write transport-specific documentation (HTTP keep-alive, SSE long-poll, stdio subprocess) for `@reaatech/mcp-load-test-client`
- **Changelog Creation**: Generate changelogs via Changesets

## Constraints
- Cannot verify accuracy of load test metrics without access to raw data
- Should maintain consistency with existing documentation style (markdown, code blocks, tables)
- May need clarification on target audience (developers vs operators vs PR reviewers)
- Package READMEs follow the A2A reference format (badges, feature overview, quick start, API reference, related packages)

## Examples
- "Write documentation for the custom pattern DSL"
- "Update the package README with StreamableHTTP transport examples"
- "Generate a markdown report from this JSON load test result"
- "Create a getting started guide for CI/CD integration"
- "Document the breaking point detection algorithm in @reaatech/mcp-load-test-analysis"
- "Write a migration guide for the monorepo package structure"
