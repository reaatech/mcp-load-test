# Agent Skills for mcp-load-test

This document describes the AI agent skills system for the mcp-load-test project. Agent skills define specific capabilities that AI assistants can use to help with development tasks.

## Project Context

**mcp-load-test** is a load testing framework purpose-built for MCP (Model Context Protocol) servers. Unlike generic HTTP load generators, it understands:

- **Tool call patterns** — Realistic sequences (explore-then-act, read-then-write, multi-step workflows)
- **Concurrent sessions** — Closed-loop concurrency with multi-turn state per session
- **Transport semantics** — StreamableHTTP, SSE, and stdio have radically different concurrency profiles
- **Latency histograms** — Per-tool P50/P90/P95/P99 tracking
- **Breaking point detection** — Adaptive load that finds where the server degrades
- **PR-ready reports** — Markdown output formatted for GitHub pull requests

This project pairs with [mcp-server-doctor](https://github.com/reaatech/mcp-server-doctor) (doctor diagnoses, load-test stresses).

## Available Skills

| Skill | Description |
|-------|-------------|
| [code-review](skills/code-review.md) | Analyze code changes with focus on concurrency safety, session lifecycle, and transport-specific logic |
| [test-generation](skills/test-generation.md) | Generate test cases for load-test components, mock MCP servers, and transport layers |
| [performance-analysis](skills/performance-analysis.md) | Analyze latency histograms, breaking points, transport profiles, and throughput metrics |
| [documentation](skills/documentation.md) | Generate and update load-test reports, YAML config docs, and architecture documentation |
| [bug-triage](skills/bug-triage.md) | Analyze transport failures, breaking point anomalies, and metric regressions |
| [refactoring](skills/refactoring.md) | Suggest refactoring for histogram precision, session pool efficiency, and pattern engine performance |

## Using Agent Skills

Skills can be invoked through MCP tools or directly referenced in conversations. Each skill file contains detailed information about its capabilities and usage.

### Example Usage

```
# Request code review with load-test context
Please review the session-manager.ts changes for concurrency safety

# Generate tests for transport layer
Generate tests for the SSE transport reconnection logic

# Performance analysis
Analyze why the p99 latency spikes at 47 concurrent sessions

# Documentation
Update the markdown reporter to include recovery analysis
```

## Skill Coordination

Multiple skills can work together for complex tasks. Examples specific to this project:

- `performance-analysis` + `refactoring` → Identify histogram bucket sizing issues and suggest optimized bucket boundaries
- `bug-triage` + `code-review` → A breaking point anomaly at 25 concurrent SSE sessions may indicate a transport-level bottleneck; review SSE transport for connection limits
- `test-generation` + `code-review` → Generate integration tests for a new load profile, then review for edge cases in timing logic
- `documentation` + `performance-analysis` → Generate a markdown report section explaining latency degradation patterns

## Adding New Skills

To add a new skill:

1. Create a new markdown file in `skills/` directory
2. Follow the skill template structure
3. Update this file to include the new skill in the table

### Skill Template

```markdown
# Skill: [Skill Name]

## Purpose
[Brief description of what this skill does in the context of MCP load testing]

## Triggers
- [Keywords or phrases that activate this skill]
- [Context indicators specific to load testing]

## Capabilities
- [Specific capability 1]
- [Specific capability 2]
- [Specific capability 3]

## Constraints
- [Limitation or requirement 1]
- [Limitation or requirement 2]

## Examples
[Example usage scenarios specific to mcp-load-test]
```

## Configuration

Skills may require configuration through environment variables or project settings. Refer to individual skill documentation for specific requirements.

Common configuration:
- `LOG_LEVEL` — Pino log level for debugging skill-invoked operations
- `NODE_ENV` — `development` or `production` affects error verbosity
