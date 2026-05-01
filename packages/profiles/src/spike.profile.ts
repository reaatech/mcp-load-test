import { sleep } from '@reaatech/mcp-load-test-core';
import type { SpikeProfile } from '@reaatech/mcp-load-test-core';

export async function* spikeProfileGenerator(
  profile: SpikeProfile,
): AsyncGenerator<{ concurrency: number; phase: 'baseline' | 'spike' | 'cooldown' }> {
  const adjustmentInterval = 1000;
  let elapsed = 0;

  for (let spikeIndex = 0; spikeIndex < profile.spikeCount; spikeIndex++) {
    // Baseline period before spike
    const baselineEnd = elapsed + profile.cooldownMs;
    while (elapsed < baselineEnd) {
      yield { concurrency: profile.baselineConcurrency, phase: 'baseline' };
      const remaining = baselineEnd - elapsed;
      const sleepMs = Math.min(adjustmentInterval, remaining);
      await sleep(sleepMs);
      elapsed += sleepMs;
    }

    // Spike
    const spikeEnd = elapsed + profile.spikeDurationMs;
    while (elapsed < spikeEnd) {
      yield { concurrency: profile.spikeConcurrency, phase: 'spike' };
      const remaining = spikeEnd - elapsed;
      const sleepMs = Math.min(adjustmentInterval, remaining);
      await sleep(sleepMs);
      elapsed += sleepMs;
    }
  }

  // Final cooldown
  const finalCooldownEnd = elapsed + profile.cooldownMs;
  while (elapsed < finalCooldownEnd) {
    yield { concurrency: profile.baselineConcurrency, phase: 'cooldown' };
    const remaining = finalCooldownEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }
}
