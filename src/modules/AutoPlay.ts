/**
 * 自动连播模块
 * 
 * 通过 React Fiber 树遍历直接操作 React 内部 useState 的 dispatch 函数来切换视频。
 * 已验证：sidebar item fiber → 向上 14 层 → 找到含 videoList + currentVideo 的 hooks → dispatch 切换。
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

interface HookState {
  memoizedState: any;
  queue?: {
    dispatch?: (value: any) => void;
    last?: any;
  };
  next?: HookState;
}

interface ComponentHooks {
  fiber: any;
  videoListHook: HookState | null;
  currentVideoHook: HookState | null;
}

export class AutoPlay {
  private intervalId: number | null = null;
  private observer: MutationObserver | null = null;
  private videoEndedHandler: (() => void) | null = null;
  private config: AutoPlayConfig;
  private currentMode: PlayMode = PlayMode.PROGRESS_85;
  private lastSwitchTime: number = 0;
  private cachedHooks: ComponentHooks | null = null;

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

  // ========== React Fiber 工具函数 ==========

  private getReactFiber(element: Element): any | null {
    const key = Object.keys(element).find(k =>
      k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber')
    );
    if (!key) return null;
    return (element as any)[key];
  }

  /**
   * 从 sidebar item 出发，找到管理视频列表的 React 组件的 hooks。
   * 策略：遍历所有 hooks，按特征匹配：
   *   - videoListHook: Array 类型，元素含 lessonId（视频列表）
   *   - currentVideoHook: Object 类型，含 lessonId/title，有 dispatch（当前选中视频）
   */
  private findComponentHooks(): ComponentHooks | null {
    const container = findElement(SELECTORS.videoList);
    if (!container) return null;

    // 取第一个 item 的 fiber
    const item = container.querySelector('[class*="item-"]') as HTMLElement;
    if (!item) return null;

    const fiber = this.getReactFiber(item);
    if (!fiber) return null;

    // 向上遍历找包含正确 hooks 的组件
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

          // 视频列表：数组，元素含 lessonId
          if (!videoListHook && Array.isArray(state) && state.length > 0 && state[0]?.lessonId) {
            videoListHook = hook;
          }

          // 当前视频：对象，含 lessonId 和 title，有 dispatch
          if (!currentVideoHook && hasDispatch && !Array.isArray(state) &&
              state && typeof state === 'object' &&
              state.lessonId && state.title && state.contentUrl) {
            currentVideoHook = hook;
            DebugLogger.debug('AutoPlay', `找到 currentVideo hook (depth=${depth}): ${state.title}`);
          }

          hook = hook.next as HookState;
        }

        if (videoListHook && currentVideoHook) {
          DebugLogger.debug('AutoPlay', `找到组件 hooks: videoList(${videoListHook.memoizedState.length}项), currentVideo`);
          return { fiber: current, videoListHook, currentVideoHook };
        }
      }

      current = current.return;
      depth++;
    }

    return null;
  }

  /**
   * 获取或缓存组件 hooks
   */
  private getCachedHooks(): ComponentHooks | null {
    if (this.cachedHooks) {
      // 验证缓存仍然有效
      const state = this.cachedHooks.videoListHook?.memoizedState;
      if (Array.isArray(state) && state.length > 0) {
        return this.cachedHooks;
      }
    }
    this.cachedHooks = this.findComponentHooks();
    return this.cachedHooks;
  }

  /**
   * 通过 React dispatch 切换视频
   */
  private switchVideo(targetVideo: any): boolean {
    const hooks = this.getCachedHooks();
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

  private switchToNext(): void {
    const now = Date.now();
    if (now - this.lastSwitchTime < 3000) {
      DebugLogger.debug('AutoPlay', '切换冷却中，跳过');
      return;
    }

    const hooks = this.getCachedHooks();
    if (!hooks) {
      DebugLogger.error('AutoPlay', '未找到组件 hooks');
      return;
    }

    const videoList: any[] = hooks.videoListHook?.memoizedState || [];
    const currentVideo: any = hooks.currentVideoHook?.memoizedState;

    if (!videoList.length || !currentVideo) {
      DebugLogger.error('AutoPlay', 'videoList 或 currentVideo 为空');
      return;
    }

    // 找当前视频在列表中的位置
    const currentIdx = videoList.findIndex(v => v.lessonId === currentVideo.lessonId);
    DebugLogger.debug('AutoPlay', `当前视频: ${currentVideo.title} (idx=${currentIdx}, total=${videoList.length})`);

    // 找下一个未完成的视频
    let nextVideo: any = null;

    // 1. 优先找未完成的
    for (let i = currentIdx + 1; i < videoList.length; i++) {
      if (!videoList[i].finished) {
        nextVideo = videoList[i];
        break;
      }
    }

    // 2. 全部已完成，找下一个（循环）
    if (!nextVideo && currentIdx + 1 < videoList.length) {
      nextVideo = videoList[currentIdx + 1];
    }

    // 3. 到末尾，回到第一个
    if (!nextVideo && videoList.length > 0) {
      nextVideo = videoList[0];
    }

    if (!nextVideo) {
      DebugLogger.debug('AutoPlay', '没有更多视频');
      return;
    }

    this.lastSwitchTime = now;
    DebugLogger.log('AutoPlay', `准备切换到: ${nextVideo.title}`);

    const switched = this.switchVideo(nextVideo);
    if (switched) {
      // 清除缓存，下次重新查找
      this.cachedHooks = null;
    }
  }
}
