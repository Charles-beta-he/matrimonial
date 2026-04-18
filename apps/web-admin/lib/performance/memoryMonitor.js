/**
 * Memory Monitor
 * Uses performance.memory API (Chrome) to monitor JS Heap usage
 * Provides getMemoryInfo API
 */

class MemoryMonitor {
  constructor(options = {}) {
    this.warningThreshold = options.warningThreshold || 50 * 1024 * 1024; // 50MB default
    this.criticalThreshold = options.criticalThreshold || 100 * 1024 * 1024; // 100MB default
    this.warningCallback = options.warningCallback || this.defaultWarningCallback;
    this.criticalCallback = options.criticalCallback || this.defaultCriticalCallback;
    this.isSupported = this.checkSupport();
    this.lastCheck = 0;
    this.checkInterval = options.checkInterval || 5000; // Check every 5 seconds
  }

  checkSupport() {
    return typeof performance !== 'undefined' && performance.memory !== undefined;
  }

  defaultWarningCallback(memoryInfo) {
    const usedMB = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    const totalMB = (memoryInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2);
    console.warn(`Memory warning: ${usedMB}MB used of ${totalMB}MB total`);
  }

  defaultCriticalCallback(memoryInfo) {
    const usedMB = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
    const totalMB = (memoryInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2);
    console.error(`Critical memory usage: ${usedMB}MB used of ${totalMB}MB total`);
  }

  getMemoryInfo() {
    if (!this.isSupported) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        isSupported: false,
        timestamp: Date.now()
      };
    }

    const memory = performance.memory;
    const memoryInfo = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      isSupported: true,
      timestamp: Date.now()
    };

    // Check thresholds
    if (memory.usedJSHeapSize > this.criticalThreshold) {
      this.criticalCallback(memoryInfo);
    } else if (memory.usedJSHeapSize > this.warningThreshold) {
      this.warningCallback(memoryInfo);
    }

    return memoryInfo;
  }

  getMemoryUsagePercent() {
    if (!this.isSupported) return 0;
    const memory = performance.memory;
    return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
  }

  getFormattedMemoryInfo() {
    const info = this.getMemoryInfo();
    if (!info.isSupported) {
      return { message: 'Memory monitoring not supported in this browser' };
    }

    return {
      used: `${(info.usedJSHeapSize / (1024 * 1024)).toFixed(2)} MB`,
      total: `${(info.totalJSHeapSize / (1024 * 1024)).toFixed(2)} MB`,
      limit: `${(info.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)} MB`,
      usagePercent: `${this.getMemoryUsagePercent().toFixed(2)}%`,
      timestamp: new Date(info.timestamp).toISOString()
    };
  }

  startPeriodicCheck() {
    if (!this.isSupported) return;
    
    this.intervalId = setInterval(() => {
      this.getMemoryInfo();
    }, this.checkInterval);
  }

  stopPeriodicCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Singleton instance
let instance = null;

export function createMemoryMonitor(options) {
  if (!instance) {
    instance = new MemoryMonitor(options);
  }
  return instance;
}

export function getMemoryMonitor() {
  return instance;
}

export default MemoryMonitor;