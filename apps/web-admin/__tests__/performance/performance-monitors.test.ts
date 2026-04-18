import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFPSMonitor } from '../../lib/performance/fpsMonitor';
import { createMemoryMonitor } from '../../lib/performance/memoryMonitor';

describe('Performance Monitors', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: Function) => setTimeout(cb, 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FPSMonitor', () => {
    it('should create a singleton instance', () => {
      const monitor1 = createFPSMonitor();
      const monitor2 = createFPSMonitor();
      expect(monitor1).toBe(monitor2);
    });

    it('should start and stop monitoring', () => {
      const monitor = createFPSMonitor();
      expect(monitor.isMonitoring()).toBe(false);
      
      monitor.start();
      expect(monitor.isMonitoring()).toBe(true);
      
      monitor.stop();
      expect(monitor.isMonitoring()).toBe(false);
    });

    it('should return FPS value', () => {
      const monitor = createFPSMonitor();
      expect(monitor.getFPS()).toBe(0);
    });
  });

  describe('MemoryMonitor', () => {
    it('should create a singleton instance', () => {
      const monitor1 = createMemoryMonitor();
      const monitor2 = createMemoryMonitor();
      expect(monitor1).toBe(monitor2);
    });

    it('should check support for performance.memory', () => {
      const monitor = createMemoryMonitor();
      // In jsdom, performance.memory is undefined by default
      expect(monitor.isSupported).toBe(false);
    });

    it('should return memory info even when not supported', () => {
      const monitor = createMemoryMonitor();
      const info = monitor.getMemoryInfo();
      expect(info).toHaveProperty('isSupported', false);
      expect(info).toHaveProperty('timestamp');
    });
  });
});