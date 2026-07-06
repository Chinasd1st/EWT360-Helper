/**
 * 自动过检模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElementByText } from '../selectors';

export class AutoCheckPass {
  private intervalId: number | null = null;
  private checkInterval: number;

  constructor(checkInterval: number = 1500) {
    this.checkInterval = checkInterval;
  }

  toggle(isEnabled: boolean): void {
    isEnabled ? this.start() : this.stop();
  }

  start(): void {
    if (this.intervalId) {
      DebugLogger.debug('AutoCheckPass', '已在运行');
      return;
    }
    this.intervalId = window.setInterval(() => this.checkAndClick(), this.checkInterval);
    DebugLogger.log('AutoCheckPass', '自动过检已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      DebugLogger.log('AutoCheckPass', '自动过检已关闭');
    }
  }

  private checkAndClick(): void {
    try {
      const checkButton = findElementByText(SELECTORS.checkButton.text || ['点击通过检查']);
      if (checkButton && !checkButton.dataset.checkClicked) {
        checkButton.dataset.checkClicked = 'true';
        checkButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        DebugLogger.log('AutoCheckPass', '已自动通过检查');
        setTimeout(() => delete checkButton.dataset.checkClicked, 3000);
      }
    } catch (error) {
      DebugLogger.error('AutoCheckPass', '过检出错', error);
    }
  }
}
