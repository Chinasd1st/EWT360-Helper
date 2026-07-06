/**
 * 自动连播模块
 * 
 * 通过 React Fiber dispatch 直接操作状态切换视频。
 * 双重触发机制：ended 事件 + checkProgress 轮询检测 video.ended
 */

import { DebugLogger } from '../utils/DebugLogger';
import { SELECTORS, findElement } from '../selectors';

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

interface HookState {
  memoizedState: any;
  queue?: { dispatch?: (value: any) => void };
  next?: HookState;
}

export class AutoPlay {
  private intervalId: number | null = null;
  private observer: MutationObserver | null = null;
  private videoEndedHandler: (() => void) | null = null;
  private config: AutoPlayConfig;
  private currentMode: PlayMode = PlayMode.PROGRESS_85;
  private lastSwitchTime: number = 0;
  private videoEndedFired: boolean = false;

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
    this.observer = new MutationObserver(() => {
      this.tryAttachVideoListener();
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
      if (this.videoEndedFired) return;
      this.videoEndedFired = true;
      DebugLogger.log('AutoPlay', '视频 ended 事件触发');
      setTimeout(() => this.switchToNext(), 500);
    };
    video.addEventListener('ended', this.videoEndedHandler);
    (video as any).__ewtAttached = true;
    DebugLogger.debug('AutoPlay', '已绑定 ended 事件');
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

      const { currentTime, duration, ended } = video;
      if (isNaN(duration) || duration <= 0) return;

      // 机制1：视频已结束（ended 事件可能未触发，这里兜底）
      if (ended && !this.videoEndedFired) {
        this.videoEndedFired = true;
        DebugLogger.log('AutoPlay', 'checkProgress 检测到 video.ended');
        setTimeout(() => this.switchToNext(), 500);
        return;
      }

      // 机制2：进度阈值检测
      if (this.currentMode === PlayMode.PROGRESS_85) {
        const progress = currentTime / duration;
        if (progress >= this.config.progressThreshold) {
          if (!this.videoEndedFired) {
            this.videoEndedFired = true;
            DebugLogger.log('AutoPlay', `checkProgress 达到阈值 ${Math.round(progress * 100)}%`);
            this.switchToNext();
          }
        }
      }
    } catch (error) {
      DebugLogger.error('AutoPlay', '检查进度出错', error);
    }
  }

  // ========== React Fiber 工具函数 ==========

  private getReactFiber(element: Element): any | null {
    const key = Object.keys(element).find(k =>
      k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber')
    );
    if (!key) return null;
    return (element as any)[key];
  }

  /**
   * 从 sidebar item 向上遍历，找到包含 videoList + currentVideo hooks 的组件
   */
  private findComponentHooks(): { videoListHook: HookState; currentVideoHook: HookState } | null {
    // 1. 找容器
    const container = findElement(SELECTORS.videoList);
    if (!container) {
      DebugLogger.debug('AutoPlay', 'videoList 容器未找到');
      return null;
    }

    // 2. 找 item
    const item = container.querySelector('[class*="item-"]') as HTMLElement;
    if (!item) {
      DebugLogger.debug('AutoPlay', 'item 元素未找到');
      return null;
    }

    // 3. 找 React fiber key
    const fiberKey = Object.keys(item).find(k =>
      k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber')
    );
    if (!fiberKey) {
      DebugLogger.debug('AutoPlay', 'React fiber key 未找到');
      return null;
    }

    const fiber = (item as any)[fiberKey];
    let current: any = fiber;
    let depth = 0;

    while (current && depth < 80) {
      if (current.memoizedState) {
        let hook: HookState = current.memoizedState;
        let videoListHook: HookState | null = null;
        let currentVideoHook: HookState | null = null;

        while (hook) {
          const state = hook.memoizedState;
          const hasDispatch = typeof hook.queue?.dispatch === 'function';

          if (!videoListHook && Array.isArray(state) && state.length > 0 && state[0]?.lessonId) {
            videoListHook = hook;
          }

          if (!currentVideoHook && hasDispatch && !Array.isArray(state) &&
              state && typeof state === 'object' &&
              state.lessonId && state.title && state.contentUrl) {
            currentVideoHook = hook;
          }

          hook = hook.next as HookState;
        }

        if (videoListHook && currentVideoHook) {
          DebugLogger.debug('AutoPlay', `找到 hooks (depth=${depth})`);
          return { videoListHook, currentVideoHook };
        }
      }

      current = current.return;
      depth++;
    }

    DebugLogger.debug('AutoPlay', `遍历完成但未匹配 hooks (depth=${depth})`);
    return null;
  }

  /**
   * 通过 dispatch 切换视频
   */
  private switchVideo(targetVideo: any): boolean {
    const hooks = this.findComponentHooks();
    if (!hooks?.currentVideoHook?.queue?.dispatch) {
      DebugLogger.error('AutoPlay', '未找到 currentVideo dispatch');
      return false;
    }

    try {
      hooks.currentVideoHook.queue.dispatch(targetVideo);
      DebugLogger.log('AutoPlay', `dispatch 切换到: ${targetVideo.title}`);
      return true;
    } catch (e) {
      DebugLogger.error('AutoPlay', 'dispatch 切换失败', e);
      return false;
    }
  }

  private switchToNext(attempt: number = 0): void {
    const now = Date.now();
    if (now - this.lastSwitchTime < 3000) {
      DebugLogger.debug('AutoPlay', '切换冷却中，跳过');
      return;
    }

    const hooks = this.findComponentHooks();
    if (!hooks) {
      // React hooks 可能还没准备好，重试（最多 5 次，间隔 1s）
      if (attempt < 5) {
        DebugLogger.debug('AutoPlay', `hooks 未就绪，${attempt + 1}s 后重试 (${attempt + 1}/5)`);
        setTimeout(() => this.switchToNext(attempt + 1), 1000);
      }
      return;
    }

    const videoList: any[] = hooks.videoListHook?.memoizedState || [];
    const currentVideo: any = hooks.currentVideoHook?.memoizedState;

    if (!videoList.length || !currentVideo) {
      DebugLogger.error('AutoPlay', 'videoList 或 currentVideo 为空');
      return;
    }

    const currentIdx = videoList.findIndex(v => v.lessonId === currentVideo.lessonId);
    DebugLogger.debug('AutoPlay', `当前: ${currentVideo.title} (idx=${currentIdx})`);

    // 找下一个未完成的视频
    let nextVideo: any = null;

    for (let i = currentIdx + 1; i < videoList.length; i++) {
      if (!videoList[i].finished) {
        nextVideo = videoList[i];
        break;
      }
    }

    if (!nextVideo && currentIdx + 1 < videoList.length) {
      nextVideo = videoList[currentIdx + 1];
    }

    if (!nextVideo && videoList.length > 0) {
      nextVideo = videoList[0];
    }

    if (!nextVideo) {
      DebugLogger.debug('AutoPlay', '没有更多视频');
      return;
    }

    this.lastSwitchTime = now;
    this.videoEndedFired = false;

    const switched = this.switchVideo(nextVideo);
    if (switched) {
      DebugLogger.log('AutoPlay', `已切换到: ${nextVideo.title}`);
    }
  }
}
