import { BreakingPointDetector } from '@reaatech/mcp-load-test-analysis';
import { MetricsCollector } from '@reaatech/mcp-load-test-metrics';
import { describe, expect, it } from 'vitest';

describe('breaking point', () => {
  describe('BreakingPointDetector', () => {
    it('should not detect breaking point under normal conditions', () => {
      const detector = new BreakingPointDetector();
      const metrics = new MetricsCollector();
      metrics.start();

      // Record some successful requests
      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 50,
          success: true,
          timestamp: Date.now(),
        });
      }

      const broken = detector.check(50, metrics);
      expect(broken).toBe(false);
      expect(detector.getResult().detected).toBe(false);
    });

    it('should detect breaking point on high error rate', () => {
      const detector = new BreakingPointDetector({ errorRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      // Record many errors
      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'SERVER',
          timestamp: Date.now(),
        });
      }

      const broken = detector.check(50, metrics);
      expect(broken).toBe(true);
      expect(detector.getResult().detected).toBe(true);
      expect(detector.getResult().concurrencyAtBreak).toBe(50);
    });

    it('should detect breaking point on high latency', () => {
      const detector = new BreakingPointDetector({ latencyP99: 100 });
      const metrics = new MetricsCollector();
      metrics.start();

      // Record high latency requests
      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 200,
          success: true,
          timestamp: Date.now(),
        });
      }

      const broken = detector.check(50, metrics);
      expect(broken).toBe(true);
    });

    it('should detect breaking point on timeout rate', () => {
      const detector = new BreakingPointDetector({ timeoutRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'TIMEOUT',
          timestamp: Date.now(),
        });
      }

      const broken = detector.check(50, metrics);
      expect(broken).toBe(true);
    });

    it('should detect breaking point on connection failures', () => {
      const detector = new BreakingPointDetector({ connectionFailures: 5 });
      const metrics = new MetricsCollector();
      metrics.start();

      for (let i = 0; i < 10; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'CONNECTION',
          timestamp: Date.now(),
        });
      }

      const broken = detector.check(50, metrics);
      expect(broken).toBe(true);
    });

    it('should remain broken after first detection', () => {
      const detector = new BreakingPointDetector({ errorRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'SERVER',
          timestamp: Date.now(),
        });
      }

      detector.check(50, metrics);
      expect(detector.check(30, metrics)).toBe(true); // Should remain true
    });

    it('should reset state', () => {
      const detector = new BreakingPointDetector({ errorRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'SERVER',
          timestamp: Date.now(),
        });
      }

      detector.check(50, metrics);
      detector.reset();
      expect(detector.getResult().detected).toBe(false);
    });
  });

  describe('recovery detection', () => {
    it('should not report recovery while not broken', () => {
      const detector = new BreakingPointDetector();
      const metrics = new MetricsCollector();
      metrics.start();
      detector.check(10, metrics);
      expect(detector.getResult().recoveryTimeMs).toBeNull();
    });

    it('should report recovery time once errors clear in the window', () => {
      const detector = new BreakingPointDetector({ errorRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      const breakTime = Date.now() - 6000; // old enough to fall out of 5s window
      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'SERVER',
          timestamp: breakTime,
        });
      }
      expect(detector.check(50, metrics)).toBe(true);

      // Now record healthy traffic inside the window.
      for (let i = 0; i < 20; i++) {
        metrics.record({
          sessionId: `r${i}`,
          toolName: 'echo',
          latencyMs: 10,
          success: true,
          timestamp: Date.now(),
        });
      }

      detector.check(50, metrics);
      expect(detector.getResult().recoveryTimeMs).not.toBeNull();
    });

    it('should not report recovery if errors persist in the window', () => {
      const detector = new BreakingPointDetector({ errorRate: 0.05 });
      const metrics = new MetricsCollector();
      metrics.start();

      for (let i = 0; i < 100; i++) {
        metrics.record({
          sessionId: `s${i}`,
          toolName: 'echo',
          latencyMs: 0,
          success: false,
          errorCategory: 'SERVER',
          timestamp: Date.now(),
        });
      }
      detector.check(50, metrics);
      detector.check(50, metrics);
      expect(detector.getResult().recoveryTimeMs).toBeNull();
    });
  });
});
