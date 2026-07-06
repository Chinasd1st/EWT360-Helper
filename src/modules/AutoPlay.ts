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
              if (el.tagName === 'VIDEO' || el.querySelector?.('video')) {
                DebugLogger.debug('AutoPlay', '检测到 video 元素添加');
                this.tryAttachVideoListener();
              }
            }
          }
        }
      }
    });
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
      this.switchToNext();
    };
    video.addEventListener('ended', this.videoEndedHandler);
    (video as any).__ewtAttached = true;
    DebugLogger.debug('AutoPlay', '已绑定 video ended 事件');
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
    const now = Date.now();
    if (now - this.lastSwitchTime < 3000) {
      DebugLogger.debug('AutoPlay', '切换冷却中，跳过');
      return;
    }

    const videoList = this.findVideoList();
    if (!videoList) {
      DebugLogger.debug('AutoPlay', '未找到视频列表');
      return;
    }

    const items = this.getVideoItems(videoList);
    DebugLogger.debug('AutoPlay', `找到 ${items.length} 个视频项`);

    const currentIdx = this.findCurrentVideoIndex(items);
    if (currentIdx === -1) {
      DebugLogger.debug('AutoPlay', '未找到当前视频');
      return;
    }

    DebugLogger.debug('AutoPlay', `当前视频索引: ${currentIdx}`);

    const nextItem = this.findNextVideoItem(items, currentIdx);
    if (nextItem) {
      this.lastSwitchTime = now;
      const title = nextItem.textContent?.substring(0, 30) || '';
      DebugLogger.log('AutoPlay', `准备切换到: ${title}`);
      this.clickVideoItem(nextItem);
      DebugLogger.log('AutoPlay', '已自动切换下一个视频');
    } else {
      DebugLogger.debug('AutoPlay', '没有更多视频');
    }
  }

  private findVideoList(): HTMLElement | null {
    // 尝试通过选择器找到视频列表容器
    const container = findElement(SELECTORS.videoList);
    if (container) return container;

    // 回退：查找包含多个 li 的 ul 或 ol
    const lists = document.querySelectorAll('ul, ol');
    for (const list of lists) {
      const items = list.querySelectorAll('li');
      if (items.length > 5) {
        // 可能是视频列表（有多个项）
        return list as HTMLElement;
      }
    }

    return null;
  }

  private getVideoItems(container: HTMLElement): HTMLElement[] {
    // 获取所有 li 元素
    const items = container.querySelectorAll('li');
    return Array.from(items) as HTMLElement[];
  }

  private findCurrentVideoIndex(items: HTMLElement[]): number {
    for (let i = 0; i < items.length; i++) {
      if (this.isCurrentVideo(items[i])) {
        return i;
      }
    }
    return -1;
  }

  private isCurrentVideo(item: HTMLElement): boolean {
    const text = item.textContent || '';
    // 当前视频没有"已完成"文本
    return !text.includes('已完成') && !text.includes('没有更多');
  }

  private findNextVideoItem(items: HTMLElement[], currentIndex: number): HTMLElement | null {
    // 从当前索引的下一个开始找
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i];
      const text = item.textContent || '';
      
      // 跳过"没有更多视频任务了"
      if (text.includes('没有更多')) continue;
      
      // 找到下一个视频项（无论是否完成）
      return item;
    }
    
    // 如果没有找到，循环到第一个视频
    if (currentIndex > 0) {
      return items[0];
    }
    
    return null;
  }

  private clickVideoItem(item: HTMLElement): void {
    // 尝试点击标题或整个项
    const titleEl = item.querySelector('[class*="title"], [class*="name"], a, span');
    const clickTarget = titleEl || item;
    
    DebugLogger.debug('AutoPlay', `点击元素: ${(clickTarget as HTMLElement).tagName} ${(clickTarget as HTMLElement).className}`);
    
    (clickTarget as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );
  }
}
