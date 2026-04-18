/**
 * React Hook for performance monitoring
 * Automatically starts monitoring in development environment
 * Outputs performance data to console
 */

import { useEffect, useRef } from 'react';
import { createFPSMonitor } from '../lib/performance/fpsMonitor';
import { createMemoryMonitor } from '../lib/performance/memoryMonitor';

export function usePerformanceMonitor(options = {}) {
  const fpsMonitorRef = useRef(null);
  const memoryMonitorRef = useRef(null);
  const intervalRef = useRef(null);

  const {
    enableFPS = true,
    enableMemory = true,
    fpsThreshold = 30,
    memoryWarningThreshold = 50 * 1024 * 1024,
    memoryCriticalThreshold = 100 * 1024 * 1024,
    logInterval = 10000, // Log every 10 seconds
    enabled = process.env.NODE_ENV === 'development'
  } = options;

  useEffect(() => {
    // Only run in development by default
    if (!enabled) {
      console.log('Performance monitoring disabled (production mode)');
      return;
    }

    console.log('Starting performance monitoring...');

    // Initialize FPS monitor
    if (enableFPS) {
      fpsMonitorRef.current = createFPSMonitor({
        threshold: fpsThreshold,
        warningCallback: (fps) => {
          console.warn(`[Performance] Low FPS: ${fps.toFixed(1)} FPS`);
        }
      });
      fpsMonitorRef.current.start();
    }

    // Initialize Memory monitor
    if (enableMemory) {
      memoryMonitorRef.current = createMemoryMonitor({
        warningThreshold: memoryWarningThreshold,
        criticalThreshold: memoryCriticalThreshold,
        warningCallback: (memoryInfo) => {
          const usedMB = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
          console.warn(`[Performance] Memory warning: ${usedMB}MB used`);
        },
        criticalCallback: (memoryInfo) => {
          const usedMB = (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
          console.error(`[Performance] Critical memory: ${usedMB}MB used`);
        }
      });
    }

    // Periodic logging
    intervalRef.current = setInterval(() => {
      const logs = [];
      
      if (fpsMonitorRef.current) {
        const fps = fpsMonitorRef.current.getFPS();
        logs.push(`FPS: ${fps.toFixed(1)}`);
      }
      
      if (memoryMonitorRef.current) {
        const memoryInfo = memoryMonitorRef.current.getFormattedMemoryInfo();
        if (memoryInfo.message) {
          logs.push(memoryInfo.message);
        } else {
          logs.push(`Memory: ${memoryInfo.used} / ${memoryInfo.total} (${memoryInfo.usagePercent})`);
        }
      }
      
      if (logs.length > 0) {
        console.log(`[Performance] ${logs.join(' | ')}`);
      }
    }, logInterval);

    // Cleanup
    return () => {
      console.log('Stopping performance monitoring...');
      
      if (fpsMonitorRef.current) {
        fpsMonitorRef.current.stop();
      }
      
      if (memoryMonitorRef.current) {
        memoryMonitorRef.current.stopPeriodicCheck();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, enableFPS, enableMemory, fpsThreshold, memoryWarningThreshold, memoryCriticalThreshold, logInterval]);

  // Return current performance data
  const getPerformanceData = () => {
    return {
      fps: fpsMonitorRef.current?.getFPS() || 0,
      memory: memoryMonitorRef.current?.getFormattedMemoryInfo() || null
    };
  };

  return {
    getPerformanceData,
    fpsMonitor: fpsMonitorRef.current,
    memoryMonitor: memoryMonitorRef.current
  };
}

// Higher-order component for class components
export function withPerformanceMonitor(WrappedComponent, options = {}) {
  return function WithPerformanceMonitor(props) {
    usePerformanceMonitor(options);
    return <WrappedComponent {...props} />;
  };
}

export default usePerformanceMonitor;