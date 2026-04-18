/**
 * FPS Monitor
 * Uses requestAnimationFrame to calculate frames per second
 * Provides start/stop/getFPS API
 */

class FPSMonitor {
  constructor(options = {}) {
    this.threshold = options.threshold || 30; // Default threshold: 30 FPS
    this.warningCallback = options.warningCallback || this.defaultWarningCallback;
    this.isRunning = false;
    this.frameCount = 0;
    this.lastTime = 0;
    this.fps = 0;
    this.animationFrameId = null;
    this.boundLoop = this.loop.bind(this);
  }

  defaultWarningCallback(fps) {
    console.warn(`Low FPS detected: ${fps.toFixed(1)} FPS (threshold: ${this.threshold})`);
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    if (this.lastTime) {
      const delta = timestamp - this.lastTime;
      if (delta >= 1000) {
        this.fps = (this.frameCount * 1000) / delta;
        this.frameCount = 0;
        this.lastTime = timestamp;
        
        if (this.fps < this.threshold) {
          this.warningCallback(this.fps);
        }
      }
    } else {
      this.lastTime = timestamp;
    }

    this.frameCount++;
    this.animationFrameId = requestAnimationFrame(this.boundLoop);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastTime = 0;
    this.fps = 0;
    this.animationFrameId = requestAnimationFrame(this.boundLoop);
    console.log('FPS Monitor started');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('FPS Monitor stopped');
  }

  getFPS() {
    return this.fps;
  }

  isMonitoring() {
    return this.isRunning;
  }
}

// Singleton instance
let instance = null;

export function createFPSMonitor(options) {
  if (!instance) {
    instance = new FPSMonitor(options);
  }
  return instance;
}

export function getFPSMonitor() {
  return instance;
}

export default FPSMonitor;