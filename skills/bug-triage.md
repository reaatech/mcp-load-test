# Skill: Bug Triage

## Purpose
Analyze, categorize, and prioritize bug reports and anomalies in mcp-load-test and the load test results it produces. Focus on transport failures, breaking point anomalies, and metric regressions.

## Triggers
- "Triage this bug"
- "Analyze the issue"
- "Why did the breaking point drop?"
- "Transport failure analysis"
- "Metric regression"
- "Is this a critical bug?"
- When user shares bug reports, crash logs, or anomalous load test results

## Capabilities
- **Bug Classification**: Categorize issues by package (core, client, engine, metrics, patterns, profiles, analysis, reporters, cli)
- **Severity Assessment**: Evaluate impact on load test accuracy and reliability
- **Transport Failure Analysis**: Diagnose SSE disconnects, HTTP session expiry, and stdio process crashes in `@reaatech/mcp-load-test-client`
- **Breaking Point Anomaly Detection**: Identify suspicious breaking point shifts between runs in `@reaatech/mcp-load-test-analysis`
- **Metric Regression Analysis**: Detect when latency histograms, error rates, or throughput degrade unexpectedly in `@reaatech/mcp-load-test-metrics`
- **Root Cause Analysis**: Trace symptoms back to session management, transport limits, or server behavior
- **Duplicate Detection**: Identify if a transport issue affects multiple profiles or patterns

## Constraints
- Cannot reproduce bugs directly against external MCP servers
- Analysis based on provided descriptions, logs, and load test reports
- May need additional context about the target server and network environment
- Should not replace human judgment for release-blocking decisions

## Examples
- "Triage this SSE transport disconnect that only happens during spike tests"
- "Analyze why the breaking point dropped from 80 to 25 sessions between runs"
- "Prioritize these issues: histogram memory leak vs markdown formatting bug"
- "Categorize this stdio transport failure — is it a client bug or server misbehavior?"
- "Identify which transport is responsible for the latency regression in the latest run"
