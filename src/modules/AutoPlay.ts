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
    this.startObserver();
    this.tryAttachVideoListener();
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
    DebugLogger.log('AutoPlay', `连播模式已切换：${mode === PlayMode.PROGRESS_85 ? '85%进度' : '看完后'}`);
  }

  private startObserver(): void {
    this.stopObserver();
    this.observer = new MutationObserver(() => this.tryAttachVideoListener());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private stopObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private tryAttachVideoListener(): void {
    const video = findElement(SELECTORS.video) as HTMLVideoElement | null;
    if (!video) return;
    if (this.videoEndedHandler && (video as any).__ewtAttached) return;

    this.detachVideoListener();
    this.videoEndedHandler = () => {
      DebugLogger.log('AutoPlay', '视频 ended 事件触发');
      setTimeout(() => this.switchToNext(), 500);
    };
    video.addEventListener('ended', this.videoEndedHandler);
    (video as any).__ewtAttached = true;
  }

  private detachVideoListener(): void {
    const video = findElement(SELECTORS.video) as HTMLVideoElement | null;
    if (video && this.videoEndedHandler) {
      video.removeEventListener('ended', this.videoEndedHandler);
      (video as any).__ewtAttached = false;
    }
    this.videoEndedHandler = null;
  }

  private checkProgress(): void {
    try {
      const video = findElement(SELECTORS.video) as HTMLVideoElement | null;
      if (!video) return;
      this.tryAttachVideoListener();

      if (this.currentMode !== PlayMode.PROGRESS_85) return;

      const { currentTime, duration } = video;
      if (isNaN(duration) || duration <= 0) return;

      const progress = currentTime / duration;
      if (progress >= this.config.progressThreshold) {
        this.switchToNext();
      }
    } catch (error) {
      DebugLogger.error('AutoPlay', '检查进度出错', error);
    }
  }

  private switchToNext(): void {
    const now = Date.now();
    if (now - this.lastSwitchTime < 3000) {
      DebugLogger.debug('AutoPlay', '切换冷却中，跳过');
      return;
    }

    const container = findElement(SELECTORS.videoList);
    if (!container) {
      DebugLogger.debug('AutoPlay', '未找到视频列表容器');
      return;
    }

    const items = Array.from(container.children).filter(
      el => !matchesSelector(el as HTMLElement, SELECTORS.noMoreVideo)
    ) as HTMLElement[];
    DebugLogger.debug('AutoPlay', `找到 ${items.length} 个视频项`);

    const currentIdx = items.findIndex(item => matchesSelector(item, SELECTORS.activeVideo));
    if (currentIdx === -1) {
      DebugLogger.debug('AutoPlay', '未找到当前激活视频');
      return;
    }

    DebugLogger.debug('AutoPlay', `当前视频索引: ${currentIdx}`);

    const nextItem = this.findNextItem(items, currentIdx);
    if (nextItem) {
      this.lastSwitchTime = now;
      const title = nextItem.textContent?.substring(0, 30) || '';
      DebugLogger.log('AutoPlay', `准备切换到: ${title}`);

      // 尝试点击 lessontitle 或直接 click 整个项
      const titleEl = nextItem.querySelector('[class*="lessontitle-"]');
      if (titleEl) {
        (titleEl as HTMLElement).click();
      } else {
        nextItem.click();
      }

      DebugLogger.log('AutoPlay', '已自动切换下一个视频');
    } else {
      DebugLogger.debug('AutoPlay', '没有更多视频');
    }
  }

  private findNextItem(items: HTMLElement[], currentIndex: number): HTMLElement | null {
    // 1. 找下一个未完成的视频
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (!matchesSelector(items[i], SELECTORS.completedVideo)) {
        return items[i];
      }
    }
    // 2. 全部已完成，找下一个视频（循环播放）
    for (let i = currentIndex + 1; i < items.length; i++) {
      return items[i];
    }
    // 3. 到末尾，回到第一个
    if (currentIndex > 0) return items[0];
    return null;
  }
}
