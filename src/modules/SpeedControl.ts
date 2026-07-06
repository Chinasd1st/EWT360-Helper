/**
 * 倍速控制模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElements } from '../selectors';

export class SpeedControl {
  private intervalId: number | null = null;
  private targetSpeed: string = '1X';
  private checkInterval: number;

  constructor(checkInterval: number = 3000) {
    this.checkInterval = checkInterval;
  }

  toggle(isEnabled: boolean): void {
    if (isEnabled) {
      this.setSpeed('2X');
      this.start();
    } else {
      this.setSpeed('1X');
      this.stop();
    }
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.ensureSpeed(), this.checkInterval);
    DebugLogger.log('SpeedControl', '2倍速已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      DebugLogger.log('SpeedControl', '2倍速已关闭');
    }
  }

  setSpeed(speed: string): void {
    this.targetSpeed = speed;
    this.ensureSpeed();
  }

  private ensureSpeed(): void {
    try {
      const speedItems = findElements(SELECTORS.speedItem);
      for (const item of speedItems) {
        const text = item.textContent?.trim() || '';
        if (text === this.targetSpeed && !item.classList.toString().includes('active')) {
          item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          DebugLogger.log('SpeedControl', `已设为${this.targetSpeed}`);
          break;
        }
      }
    } catch (error) {
      DebugLogger.error('SpeedControl', '倍速出错', error);
    }
  }
}
