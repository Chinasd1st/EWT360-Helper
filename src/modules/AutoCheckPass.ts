/**
 * 自动过检模块
 *
 * EWT 在 checkPassRef.current 上注册了 click 监听器，
 * 该监听器检查 event.isTrusted 和 instanceof MouseEvent。
 * 使用 el.click() 触发原生可信事件，不需要 isTrusted 绕过。
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
      if (!checkButton) return;

      if (checkButton.dataset.checkClicked) return;

      DebugLogger.debug('AutoCheckPass', `找到按钮: <${checkButton.tagName}> "${checkButton.textContent?.trim().slice(0, 30)}"`);

      checkButton.dataset.checkClicked = 'true';
      checkButton.click();
      DebugLogger.log('AutoCheckPass', '已调用 el.click()（原生可信事件）');
      setTimeout(() => delete checkButton.dataset.checkClicked, 3000);
    } catch (error) {
      DebugLogger.error('AutoCheckPass', '过检出错', error);
    }
  }
}
