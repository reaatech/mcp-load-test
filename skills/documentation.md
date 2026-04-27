# Skill: Documentation

## Purpose
Generate, update, and improve mcp-load-test documentation including PR-ready reports, YAML configuration guides, architecture diagrams, and API references.

## Triggers
- "Write documentation"
- "Update the README"
- "Document this reporter"
- "Create config docs"
- "Write a tutorial"
- "Generate load test report"
- "Update the docs"
- When user requests documentation improvements or report generation

## Capabilities
- **Report Generation**: Create markdown load test reports with executive summary, latency tables, and recommendations
- **Configuration Documentation**: Document YAML/JSON config options, CLI flags, and environment variables
- **API Documentation**: Generate API reference for programmatic load test execution
- **Architecture Documentation**: Document system architecture, data flow, and component interactions
- **Tutorial Writing**: Create how-to guides for ramp tests, soak tests, and custom pattern definition
- **Transport Guides**: Write transport-specific documentation (HTTP keep-alive, SSE long-poll, stdio subprocess)
- **Changelog Creation**: Generate changelogs from code changes and breaking point benchmark shifts

## Constraints
- Cannot verify accuracy of load test metrics without access to raw data
- Should maintain consistency with existing documentation style (markdown, code blocks, tables)
- May need clarification on target audience (developers vs operators vs PR reviewers)
- Generated reports should use the project's established markdown format

## Examples
- "Write documentation for the new custom pattern DSL"
- "Update the README with StreamableHTTP transport examples"
- "Generate a markdown report from this JSON load test result"
- "Add JSDoc comments to the LoadEngine class"
- "Create a getting started guide for CI/CD integration"
- "Document the breaking point detection algorithm"
- "Write a migration guide for upgrading from v0.1 to v0.2"
