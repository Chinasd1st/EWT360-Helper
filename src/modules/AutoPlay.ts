/**
 * 自动连播模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElement, findElementByText, matchesSelector } from '../selectors';

export enum PlayMode {
  PROGRESS_85 = 'progress85',
  FULL_PLAY = 'fullPlay'
}

export interface AutoPlayConfig {
  progressThreshold: number;
  checkInterval: number;
}

const DEFAULT_CONFIG: AutoPlayConfig = {
  progressThreshold: 0.85,
  checkInterval: 2000
};

export class AutoPlay {
  private intervalId: number | null = null;
  private config: AutoPlayConfig;
  private currentMode: PlayMode = PlayMode.PROGRESS_85;

  constructor(config: Partial<AutoPlayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  toggle(isEnabled: boolean): void {
    isEnabled ? this.start() : this.stop();
  }

  start(): void {
    if (this.intervalId) {
      DebugLogger.debug('AutoPlay', '自动连播已运行');
      return;
    }
    this.intervalId = window.setInterval(() => this.checkAndSwitch(), this.config.checkInterval);
    DebugLogger.log('AutoPlay', '自动连播已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      DebugLogger.log('AutoPlay', '自动连播已关闭');
    }
  }

  setMode(mode: PlayMode): void {
    this.currentMode = mode;
    if (mode === PlayMode.PROGRESS_85) {
      this.config.progressThreshold = 0.85;
    }
    DebugLogger.log('AutoPlay', `连播模式已切换：${mode === PlayMode.PROGRESS_85 ? '85%进度' : '看完后'}`);
  }

  private checkAndSwitch(): void {
    try {
      const video = document.querySelector(SELECTORS.video) as HTMLVideoElement | null;
      if (!video) {
        DebugLogger.debug('AutoPlay', '未找到 video 元素');
        return;
      }

      const activeVideo = this.findActiveVideo();
      if (!activeVideo) {
        DebugLogger.debug('AutoPlay', '未找到当前激活的视频项');
        return;
      }

      const canPlayNext = this.checkCanPlayNext(video);
      if (!canPlayNext) return;

      const nextVideo = this.findNextUnfinished(activeVideo);
      if (nextVideo) {
        DebugLogger.log('AutoPlay', '找到下一个未完成视频，准备切换');
        nextVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        DebugLogger.log('AutoPlay', '已自动切换下一个视频');
      } else {
        DebugLogger.debug('AutoPlay', '没有更多未完成的视频');
      }
    } catch (error) {
      DebugLogger.error('AutoPlay', '自动连播出错', error);
    }
  }

  private checkCanPlayNext(video: HTMLVideoElement): boolean {
    if (this.currentMode === PlayMode.PROGRESS_85) {
      const current = video.currentTime;
      const total = video.duration;
      if (isNaN(total) || total <= 0) {
        DebugLogger.debug('AutoPlay', `视频时长无效: ${total}`);
        return false;
      }
      const progress = current / total;
      const canPlay = progress >= this.config.progressThreshold;
      DebugLogger.debug('AutoPlay', `进度: ${(progress * 100).toFixed(1)}% (${canPlay ? '达到' : '未达到'} ${this.config.progressThreshold * 100}%)`);
      return canPlay;
    } else {
      const img = document.querySelector('img[src*="1820894120067424424"]');
      return !!img;
    }
  }

  private findActiveVideo(): HTMLElement | null {
    // 1. 使用语义化选择器
    const semanticEl = findElement(SELECTORS.activeVideo);
    if (semanticEl) return semanticEl;

    // 2. 在视频列表中查找
    const container = findElement(SELECTORS.videoList);
    if (!container) return null;

    const items = container.querySelectorAll('[class*="video-item-"], [class*="video-"]');
    for (const item of items) {
      if (matchesSelector(item as HTMLElement, SELECTORS.activeVideo)) {
        return item as HTMLElement;
      }
    }

    // 3. 查找高亮背景的元素
    for (const item of items) {
      const style = window.getComputedStyle(item);
      if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          style.backgroundColor !== 'transparent' &&
          style.backgroundColor !== 'rgb(255, 255, 255)') {
        return item as HTMLElement;
      }
    }

    return null;
  }

  private findNextUnfinished(current: HTMLElement): HTMLElement | null {
    let next = current.nextElementSibling;
    while (next) {
      if (!this.isCompleted(next as HTMLElement)) {
        return next as HTMLElement;
      }
      next = next.nextElementSibling;
    }
    return null;
  }

  private isCompleted(item: HTMLElement): boolean {
    return matchesSelector(item, SELECTORS.completedVideo);
  }
}
