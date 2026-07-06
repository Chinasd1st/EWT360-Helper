/**
 * 自动跳题模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElementByText } from '../selectors';

export class AutoSkip {
  private intervalId: number | null = null;
  private checkInterval: number;

  constructor(checkInterval: number = 1000) {
    this.checkInterval = checkInterval;
  }

  toggle(isEnabled: boolean): void {
    isEnabled ? this.start() : this.stop();
  }

  start(): void {
    if (this.intervalId) {
      DebugLogger.debug('AutoSkip', '自动跳题已在运行');
      return;
    }
    this.intervalId = window.setInterval(() => this.checkAndSkip(), this.checkInterval);
    DebugLogger.log('AutoSkip', '自动跳题已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      DebugLogger.log('AutoSkip', '自动跳题已关闭');
    }
  }

  private checkAndSkip(): void {
    try {
      const skipButton = findElementByText(SELECTORS.skipButton.text || ['跳过']);
      if (skipButton && !skipButton.dataset.skipClicked) {
        skipButton.dataset.skipClicked = 'true';
        skipButton.click();
        DebugLogger.log('AutoSkip', '已自动跳过题目');
        setTimeout(() => delete skipButton.dataset.skipClicked, 5000);
      }
    } catch (error) {
      DebugLogger.error('AutoSkip', '自动跳题出错', error);
    }
  }
}
