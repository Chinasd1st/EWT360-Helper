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
  private observer: MutationObserver | null = null;
  private videoEndedHandler: (() => void) | null = null;
  private config: AutoPlayConfig;
  private currentMode: PlayMode = PlayMode.PROGRESS_85;
  private lastSwitchTime: number = 0;
  private boundSwitchToNext: () => void;

  constructor(config: Partial<AutoPlayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.boundSwitchToNext = this.switchToNext.bind(this);
  }

  toggle(isEnabled: boolean): void {
    isEnabled ? this.start() : this.stop();
  }

  start(): void {
    if (this.intervalId) {
      DebugLogger.debug('AutoPlay', '自动连播已运行');
      return;
    }

    // Watch for video element creation via MutationObserver
    this.startObserver();

    // Also try to attach immediately
    this.tryAttachVideoListener();

    // Use interval as fallback for progress check
    this.intervalId = window.setInterval(() => this.checkProgress(), this.config.checkInterval);
    DebugLogger.log('AutoPlay', '自动连播已开启');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopObserver();
    this.detachVideoListener();
    DebugLogger.log('AutoPlay', '自动连播已关闭');
  }

  setMode(mode: PlayMode): void {
    this.currentMode = mode;
    if (mode === PlayMode.PROGRESS_85) {
      this.config.progressThreshold = 0.85;
    }
    DebugLogger.log('AutoPlay', `连播模式已切换：${mode === PlayMode.PROGRESS_85 ? '85%进度' : '看完后'}`);
  }

  private startObserver(): void {
    this.stopObserver();

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              // Check if added node is a video or contains a video
              if (el.tagName === 'VIDEO' || el.querySelector('video')) {
                DebugLogger.debug('AutoPlay', '检测到 video 元素添加');
                this.tryAttachVideoListener();
              }
            }
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    DebugLogger.debug('AutoPlay', 'MutationObserver 已启动');
  }

  private stopObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private tryAttachVideoListener(): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) return;

    // Check if already attached
    if (this.videoEndedHandler && (video as any).__ewtAttached) return;

    this.detachVideoListener();

    this.videoEndedHandler = () => {
      DebugLogger.log('AutoPlay', '视频 ended 事件触发');
      this.switchToNext();
    };

    video.addEventListener('ended', this.videoEndedHandler);
    (video as any).__ewtAttached = true;
    DebugLogger.debug('AutoPlay', '已绑定 video ended 事件');
  }

  private detachVideoListener(): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video && this.videoEndedHandler) {
      video.removeEventListener('ended', this.videoEndedHandler);
      (video as any).__ewtAttached = false;
    }
    this.videoEndedHandler = null;
  }

  private checkProgress(): void {
    try {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video) return;

      // Re-attach if needed
      this.tryAttachVideoListener();

      if (this.currentMode !== PlayMode.PROGRESS_85) return;

      const current = video.currentTime;
      const total = video.duration;
      if (isNaN(total) || total <= 0) return;

      const progress = current / total;
      DebugLogger.debug('AutoPlay', `进度: ${(progress * 100).toFixed(1)}%`);

      if (progress >= this.config.progressThreshold) {
        this.switchToNext();
      }
    } catch (error) {
      DebugLogger.error('AutoPlay', '检查进度出错', error);
    }
  }

  private switchToNext(): void {
    // Debounce: prevent rapid switching
    const now = Date.now();
    if (now - this.lastSwitchTime < 3000) {
      DebugLogger.debug('AutoPlay', '切换冷却中，跳过');
      return;
    }

    const activeVideo = this.findActiveVideo();
    if (!activeVideo) {
      DebugLogger.debug('AutoPlay', '未找到当前激活的视频项');
      return;
    }

    const nextVideo = this.findNextVideo(activeVideo);
    if (nextVideo) {
      this.lastSwitchTime = now;
      DebugLogger.log('AutoPlay', '找到下一个视频，准备切换');
      nextVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      DebugLogger.log('AutoPlay', '已自动切换下一个视频');
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
