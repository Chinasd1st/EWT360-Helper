/**
 * 进度条锁定功能
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElement } from '../selectors';

export class ProgressLock {
  private enabled: boolean = false;
  private lastTime: number = 0;
  private handler: (() => void) | null = null;

  toggle(isEnabled: boolean): void {
    this.enabled = isEnabled;
    if (isEnabled) {
      this.start();
    } else {
      this.stop();
    }
    DebugLogger.log('ProgressLock', `进度条锁定已${isEnabled ? '开启' : '关闭'}`);
  }

  private start(): void {
    const video = findElement(SELECTORS.video) as HTMLVideoElement | null;
    if (!video) return;

    this.lastTime = video.currentTime;

    this.handler = () => {
      if (!this.enabled) return;
      const currentTime = video.currentTime;
      const diff = currentTime - this.lastTime;

      // 检测是否被自动跳转（非用户操作）
      if (Math.abs(diff) > 2 && !video.seeking) {
        DebugLogger.log('ProgressLock', `检测到自动跳转: ${this.lastTime.toFixed(1)} -> ${currentTime.toFixed(1)}`);
        video.currentTime = this.lastTime;
      } else {
        this.lastTime = currentTime;
      }
    };

    video.addEventListener('timeupdate', this.handler);
    DebugLogger.log('ProgressLock', '进度条锁定已启动');
  }

  private stop(): void {
    const video = findElement(SELECTORS.video) as HTMLVideoElement | null;
    if (video && this.handler) {
      video.removeEventListener('timeupdate', this.handler);
    }
    this.handler = null;
    DebugLogger.log('ProgressLock', '进度条锁定已停止');
  }
}
