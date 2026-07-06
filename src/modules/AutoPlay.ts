/**
 * 自动连播模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElement, matchesSelector } from '../selectors';

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
  private videoEndedHandler: (() => void) | null = null;
  private config: AutoPlayConfig;
  private currentMode: PlayMode = PlayMode.PROGRESS_85;
  private lastSwitchedVideo: HTMLElement | null = null;

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

    // Listen for video ended event
    this.attachVideoEndedListener();

    // Also use interval as fallback
    this.intervalId = window.setInterval(() => this.checkAndSwitch(), this.config.checkInterval);
    DebugLogger.log('AutoPlay', '自动连播已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.detachVideoEndedListener();
    DebugLogger.log('AutoPlay', '自动连播已关闭');
  }

  setMode(mode: PlayMode): void {
    this.currentMode = mode;
    if (mode === PlayMode.PROGRESS_85) {
      this.config.progressThreshold = 0.85;
    }
    DebugLogger.log('AutoPlay', `连播模式已切换：${mode === PlayMode.PROGRESS_85 ? '85%进度' : '看完后'}`);
  }

  private attachVideoEndedListener(): void {
    const video = document.querySelector(SELECTORS.video) as HTMLVideoElement | null;
    if (!video) return;

    // Remove old listener if exists
    this.detachVideoEndedListener();

    // Add new listener
    this.videoEndedHandler = () => {
      DebugLogger.log('AutoPlay', '视频播放结束，准备切换下一个');
      this.switchToNext();
    };
    video.addEventListener('ended', this.videoEndedHandler);
    DebugLogger.debug('AutoPlay', '已绑定 video ended 事件');
  }

  private detachVideoEndedListener(): void {
    if (this.videoEndedHandler) {
      const video = document.querySelector(SELECTORS.video) as HTMLVideoElement | null;
      if (video) {
        video.removeEventListener('ended', this.videoEndedHandler);
      }
      this.videoEndedHandler = null;
    }
  }

  private checkAndSwitch(): void {
    try {
      const video = document.querySelector(SELECTORS.video) as HTMLVideoElement | null;
      if (!video) {
        DebugLogger.debug('AutoPlay', '未找到 video 元素');
        return;
      }

      // Re-attach listener if video element changed (e.g., after switching videos)
      if (!this.videoEndedHandler) {
        this.attachVideoEndedListener();
      }

      const activeVideo = this.findActiveVideo();
      if (!activeVideo) {
        DebugLogger.debug('AutoPlay', '未找到当前激活的视频项');
        return;
      }

      // Only check progress in PROGRESS_85 mode
      if (this.currentMode === PlayMode.PROGRESS_85) {
        const canPlayNext = this.checkProgress(video);
        if (canPlayNext) {
          this.switchToNext();
        }
      }
    } catch (error) {
      DebugLogger.error('AutoPlay', '自动连播出错', error);
    }
  }

  private checkProgress(video: HTMLVideoElement): boolean {
    const current = video.currentTime;
    const total = video.duration;
    if (isNaN(total) || total <= 0) {
      return false;
    }
    const progress = current / total;
    const canPlay = progress >= this.config.progressThreshold;
    DebugLogger.debug('AutoPlay', `进度: ${(progress * 100).toFixed(1)}% (${canPlay ? '达到' : '未达到'} ${this.config.progressThreshold * 100}%)`);
    return canPlay;
  }

  private switchToNext(): void {
    const activeVideo = this.findActiveVideo();
    if (!activeVideo) {
      DebugLogger.debug('AutoPlay', '未找到当前激活的视频项');
      return;
    }

    // Don't switch if we just switched to this video
    if (activeVideo === this.lastSwitchedVideo) {
      DebugLogger.debug('AutoPlay', '刚刚已切换过此视频，跳过');
      return;
    }

    const nextVideo = this.findNextVideo(activeVideo);
    if (nextVideo) {
      this.lastSwitchedVideo = nextVideo;
      DebugLogger.log('AutoPlay', '找到下一个视频，准备切换');
      nextVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      DebugLogger.log('AutoPlay', '已自动切换下一个视频');

      // Re-attach listener after switch (new video element will be created)
      setTimeout(() => this.attachVideoEndedListener(), 1000);
    } else {
      DebugLogger.debug('AutoPlay', '没有更多视频');
    }
  }

  private findNextVideo(current: HTMLElement): HTMLElement | null {
    // First try to find next unfinished video
    let next = current.nextElementSibling;
    while (next) {
      if (!this.isCompleted(next as HTMLElement)) {
        return next as HTMLElement;
      }
      next = next.nextElementSibling;
    }

    // All completed - find next video in list (even if completed)
    next = current.nextElementSibling;
    if (next) {
      return next as HTMLElement;
    }

    // At end of list - loop back to first video
    const firstChild = current.parentElement?.firstElementChild;
    if (firstChild && firstChild !== current) {
      return firstChild as HTMLElement;
    }

    return null;
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

  private isCompleted(item: HTMLElement): boolean {
    return matchesSelector(item, SELECTORS.completedVideo);
  }
}
