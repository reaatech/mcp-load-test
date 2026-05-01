import type { ToolCallPattern, ToolDefinition } from '@reaatech/mcp-load-test-core';

export const EXPLORE_THEN_ACT: ToolCallPattern = {
  name: 'explore-then-act',
  weight: 1,
  thinkTimeMs: 100,
  onStepError: 'continue',
  steps: [
    { tool: 'tools/list', args: {} },
    { tool: 'tools/call', args: { name: '{{random.tool}}', arguments: {} } },
  ],
};

export const READ_THEN_WRITE: ToolCallPattern = {
  name: 'read-then-write',
  weight: 1,
  thinkTimeMs: 200,
  onStepError: 'abort',
  steps: [
    { tool: 'resources/read', args: { uri: '{{random.uri}}' } },
    { tool: 'tools/call', args: { name: '{{random.tool}}', arguments: {} } },
    { tool: 'resources/read', args: { uri: '{{previous.uri}}' } },
  ],
};

export const MULTI_STEP_WORKFLOW: ToolCallPattern = {
  name: 'multi-step-workflow',
  weight: 1,
  thinkTimeMs: 150,
  onStepError: 'abort',
  steps: [
    { tool: 'tools/call', args: { name: 'create', arguments: {} } },
    { tool: 'tools/call', args: { name: 'process', arguments: { id: '{{previous.id}}' } } },
    { tool: 'tools/call', args: { name: 'cleanup', arguments: { id: '{{previous.id}}' } } },
  ],
};

export const BUILT_IN_PATTERNS: ToolCallPattern[] = [
  EXPLORE_THEN_ACT,
  READ_THEN_WRITE,
  MULTI_STEP_WORKFLOW,
];

export function resolvePattern(pattern: ToolCallPattern, tools: ToolDefinition[]): ToolCallPattern {
  // Simple resolution: replace {{random.tool}} with an actual tool name
  const toolNames = tools.map((t) => t.name);
  const randomTool = toolNames[Math.floor(Math.random() * toolNames.length)] || 'unknown';

  const resolvedSteps = pattern.steps.map((step) => ({
    ...step,
    args: Object.fromEntries(
      Object.entries(step.args).map(([key, value]) => {
        if (typeof value === 'string' && value === '{{random.tool}}') {
          return [key, randomTool];
        }
        return [key, value];
      }),
    ),
  }));

  return {
    ...pattern,
    steps: resolvedSteps,
  };
}
