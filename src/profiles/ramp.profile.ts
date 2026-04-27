import { sleep } from '../utils/index.js';
import type { RampProfile } from '../types/domain.js';

export async function* rampProfileGenerator(
  profile: RampProfile,
): AsyncGenerator<{ concurrency: number; phase: 'warmup' | 'ramp_up' | 'hold' | 'ramp_down' }> {
  const warmupDuration = profile.warmupDurationMs || 0;
  const rampDownDuration = profile.rampDownDurationMs || 0;
  const adjustmentInterval = 1000; // 1 second

  let elapsed = 0;

  // Warmup phase
  while (elapsed < warmupDuration) {
    yield { concurrency: profile.minConcurrency, phase: 'warmup' };
    const remaining = warmupDuration - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Ramp up
  const rampUpEnd = warmupDuration + profile.rampDurationMs;
  while (elapsed < rampUpEnd) {
    const progress = Math.min(1, (elapsed - warmupDuration) / profile.rampDurationMs);
    const concurrency = Math.round(
      profile.minConcurrency + (profile.maxConcurrency - profile.minConcurrency) * progress,
    );
    yield { concurrency, phase: 'ramp_up' };
    const remaining = rampUpEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Hold
  const holdEnd = rampUpEnd + profile.holdDurationMs;
  while (elapsed < holdEnd) {
    yield { concurrency: profile.maxConcurrency, phase: 'hold' };
    const remaining = holdEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Ramp down
  const rampDownEnd = holdEnd + rampDownDuration;
  while (elapsed < rampDownEnd) {
    const progress = Math.min(1, (elapsed - holdEnd) / rampDownDuration);
    const concurrency = Math.round(
      profile.maxConcurrency - (profile.maxConcurrency - profile.minConcurrency) * progress,
    );
    yield { concurrency, phase: 'ramp_down' };
    const remaining = rampDownEnd - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }
}
