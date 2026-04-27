import { sleep } from '../utils/index.js';
import type { CustomProfile } from '../types/domain.js';

export async function* customProfileGenerator(
  profile: CustomProfile,
): AsyncGenerator<{ concurrency: number; phase: 'warmup' | 'active' }> {
  const warmupDuration = profile.warmupDurationMs || 0;
  const curve = profile.concurrencyCurve.sort((a, b) => a.timeMs - b.timeMs);
  const adjustmentInterval = 1000;

  let elapsed = 0;
  const maxTime = curve.length > 0 ? curve[curve.length - 1]!.timeMs : 0;

  if (curve.length === 0 && warmupDuration === 0) {
    return;
  }

  // Warmup
  while (elapsed < warmupDuration) {
    const baseConcurrency = curve.length > 0 ? curve[0]!.concurrency : 0;
    yield { concurrency: baseConcurrency, phase: 'warmup' };
    const remaining = warmupDuration - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }

  // Active: interpolate from curve
  while (elapsed <= maxTime) {
    const concurrency = interpolateConcurrency(curve, elapsed);
    yield { concurrency, phase: 'active' };
    const remaining = maxTime - elapsed;
    const sleepMs = Math.min(adjustmentInterval, remaining || adjustmentInterval);
    await sleep(sleepMs);
    elapsed += sleepMs;
  }
}

function interpolateConcurrency(
  curve: Array<{ timeMs: number; concurrency: number }>,
  timeMs: number,
): number {
  if (curve.length === 0) return 0;
  if (timeMs <= curve[0]!.timeMs) return curve[0]!.concurrency;
  if (timeMs >= curve[curve.length - 1]!.timeMs) return curve[curve.length - 1]!.concurrency;

  for (let i = 0; i < curve.length - 1; i++) {
    const curr = curve[i];
    const next = curve[i + 1];
    if (!curr || !next) continue;
    if (timeMs >= curr.timeMs && timeMs <= next.timeMs) {
      const progress = (timeMs - curr.timeMs) / (next.timeMs - curr.timeMs);
      return Math.round(curr.concurrency + (next.concurrency - curr.concurrency) * progress);
    }
  }

  return curve[curve.length - 1]!.concurrency;
}
