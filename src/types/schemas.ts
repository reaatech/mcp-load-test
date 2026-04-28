import { z } from 'zod';

export const gradeSchema = z.enum(['A', 'B', 'C', 'D', 'F']);

export const transportTypeSchema = z.enum(['stdio', 'sse', 'http', 'auto']);
export const authModeSchema = z.enum(['none', 'api-key', 'bearer', 'oauth']);

export const authOptionsSchema = z.object({
  mode: authModeSchema,
  apiKey: z.string().optional(),
  bearerToken: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
});

export const patternStepSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()).default({}),
});

export const toolCallPatternSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).default(1),
  thinkTimeMs: z.number().int().min(0).default(0),
  onStepError: z.enum(['abort', 'continue']).default('continue'),
  steps: z.array(patternStepSchema).min(1),
});

export const rampProfileSchema = z.object({
  type: z.literal('ramp'),
  minConcurrency: z.number().int().min(0),
  maxConcurrency: z.number().int().min(1),
  rampDurationMs: z.number().int().min(0),
  holdDurationMs: z.number().int().min(0),
  rampDownDurationMs: z.number().int().min(0).optional(),
  warmupDurationMs: z.number().int().min(0).optional(),
});

export const soakProfileSchema = z.object({
  type: z.literal('soak'),
  concurrency: z.number().int().min(1),
  durationMs: z.number().int().min(0),
  warmupDurationMs: z.number().int().min(0).optional(),
  sampleIntervalMs: z.number().int().min(100).default(1000),
});

export const spikeProfileSchema = z.object({
  type: z.literal('spike'),
  baselineConcurrency: z.number().int().min(0),
  spikeConcurrency: z.number().int().min(1),
  spikeDurationMs: z.number().int().min(0),
  spikeCount: z.number().int().min(1),
  cooldownMs: z.number().int().min(0),
});

export const customProfileSchema = z.object({
  type: z.literal('custom'),
  concurrencyCurve: z.array(
    z.object({
      timeMs: z.number().int().min(0),
      concurrency: z.number().int().min(0),
    }),
  ),
  warmupDurationMs: z.number().int().min(0).optional(),
});

export const loadProfileSchema = z.union([
  rampProfileSchema,
  soakProfileSchema,
  spikeProfileSchema,
  customProfileSchema,
]);

export const loadEngineOptionsSchema = z.object({
  endpoint: z.string(),
  transport: transportTypeSchema,
  auth: authOptionsSchema.optional(),
  profile: loadProfileSchema,
  patterns: z.array(toolCallPatternSchema).min(1),
  breakingPointDetection: z.boolean().default(false),
  outputFormat: z.enum(['console', 'markdown', 'json']).default('console'),
});
