import { sleep } from '@reaatech/mcp-load-test-core';
import type { SoakProfile } from '@reaatech/mcp-load-test-core';

export async function* soakProfileGenerator(
  profile: SoakProfile,
): AsyncGenerator<{ concurrency: number; phase: 'warmup' | 'active' | 'cooldown' }> {
  const warmupDuration = profile.warmupDurationMs || 0;
  const adjustmentInterval = 1000;

  let elapsed = 0;

  // Warmup
  while (elapsed < warmupDuration) {
    yield { concurrency: profile.concurrency, phase: 'warmup' };
    const remaining = warmupDuration - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Active phase
  const activeEnd = warmupDuration + profile.durationMs;
  while (elapsed < activeEnd) {
    yield { concurrency: profile.concurrency, phase: 'active' };
    const remaining = activeEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Cooldown (brief observation period)
  const cooldownDuration = Math.min(5000, profile.durationMs * 0.05);
  const cooldownEnd = activeEnd + cooldownDuration;
  while (elapsed < cooldownEnd) {
    yield { concurrency: profile.concurrency, phase: 'cooldown' };
    const remaining = cooldownEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }
}
