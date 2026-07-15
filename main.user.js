// ==UserScript==
// @name         升学E网通助手 v3
// @namespace    https://github.com/Chinasd1st/EWT360-Helper
// @version      3.0.1
// @description  用于帮助学生通过升学E网通更好学习知识
// @match        https://teacher.ewt360.com/ewtbend/bend/index/index.html*
// @match        http://teacher.ewt360.com/ewtbend/bend/index/index.html*
// @match        https://web.ewt360.com/site-study/*
// @match        http://web.ewt360.com/site-study/*
// @author       Chinasd1st
// @icon         https://www.ewt360.com/favicon.ico
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Chinasd1st/EWT360-Helper/output/main.user.js
// @downloadURL  https://raw.githubusercontent.com/Chinasd1st/EWT360-Helper/output/main.user.js
// @supportURL   https://github.com/Chinasd1st/EWT360-Helper/issues
// ==/UserScript==


(function() {
  "use strict";
  function getTimestamp() {
    const now = /* @__PURE__ */ new Date();
    return `[${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}]`;
  }
  function formatMessage(module, message) {
    return `${getTimestamp()} [${module}] ${message}`;
  }
  const DebugLogger = {
    enabled: true,
    log(module, message, data) {
      if (!this.enabled) return;
      const msg = formatMessage(module, `[INFO] ${message}`);
      data ? console.log(msg, data) : console.log(msg);
    },
    warn(module, message, data) {
      if (!this.enabled) return;
      const msg = formatMessage(module, `[WARN] ${message}`);
      data ? console.warn(msg, data) : console.warn(msg);
    },
    error(module, message, error) {
      if (!this.enabled) return;
      const msg = formatMessage(module, `[ERROR] ${message}`);
      error ? console.error(msg, error) : console.error(msg);
    },
    debug(module, message, data) {
      if (!this.enabled) return;
      const msg = formatMessage(module, `[DEBUG] ${message}`);
      data ? console.debug(msg, data) : console.debug(msg);
    }
  };
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const wrappedListenersMap = /* @__PURE__ */ new WeakMap();
  let installed = false;
  function installIsTrustedBypass() {
    if (installed) return;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (typeof listener !== "function" || type !== "click" || !String(listener).includes("isTrusted")) {
        return originalAddEventListener.call(this, type, listener, options);
      }
      DebugLogger.log("IsTrustedBypass", `劫持 click 监听器: ${String(listener).slice(0, 80)}...`);
      let wrappedListener = wrappedListenersMap.get(listener);
      if (!wrappedListener) {
        wrappedListener = function(event) {
          if (event && typeof event === "object" && "isTrusted" in event) {
            const eventProxy = new Proxy(event, {
              get(target, prop) {
                if (prop === "isTrusted") {
                  if (target.isTrusted === false && (target.type === "click" || target.type === "submit" || target.type === "change")) {
                    DebugLogger.log("IsTrustedBypass", `篡改 ${target.type} isTrusted: false -> true`);
                    return true;
                  }
                  return target.isTrusted;
                }
                const value = target[prop];
                return typeof value === "function" ? value.bind(target) : value;
              }
            });
            return listener.call(this, eventProxy);
          }
          return listener.call(this, event);
        };
        wrappedListenersMap.set(listener, wrappedListener);
        wrappedListenersMap.set(wrappedListener, listener);
      }
      return originalAddEventListener.call(this, type, wrappedListener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      if (typeof listener === "function") {
        const wrappedListener = wrappedListenersMap.get(listener);
        if (wrappedListener) {
          return originalRemoveEventListener.call(this, type, wrappedListener, options);
        }
      }
      return originalRemoveEventListener.call(this, type, listener, options);
    };
    installed = true;
    DebugLogger.log("IsTrustedBypass", "addEventListener 劫持已启动");
  }
  const SELECTORS = {
    /**
     * 视频元素
     */
    video: {
      semantic: ["video"],
      structural: [],
      cssModule: []
    },
    /**
     * 视频播放器容器
     */
    videoPlayer: {
      semantic: [
        '[role="region"][aria-label="视频播放器"]'
      ],
      structural: [
        ".play_video_main_box",
        '[class*="player-wrapper"]'
      ],
      cssModule: []
    },
    /**
     * 视频列表容器
     */
    videoList: {
      semantic: [],
      structural: [
        '[class*="lessonList"] [class*="listCon"]'
      ],
      cssModule: [
        '[class*="listCon-"]'
      ]
    },
    /**
     * 学生播放器页面容器
     */
    studentPlayer: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="studentPlayer-"]'
      ]
    },
    /**
     * 视频项
     */
    videoItem: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="item-"][class*="item"]'
      ]
    },
    /**
     * 当前激活的视频项
     */
    activeVideo: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="active-"]'
      ]
    },
    /**
     * 已完成的视频项
     */
    completedVideo: {
      semantic: [],
      structural: [],
      cssModule: [],
      text: ["已完成"]
    },
    /**
     * 没有更多视频的提示
     */
    noMoreVideo: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="noMore-"]'
      ]
    },
    /**
     * 通过检查按钮
     */
    checkButton: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="btn-"]'
      ],
      text: ["点击通过检查", "通过检查", "确认"]
    },
    /**
     * 跳过按钮
     */
    skipButton: {
      semantic: [],
      structural: [],
      cssModule: [],
      text: ["跳过"]
    },
    /**
     * 速度菜单项
     */
    speedItem: {
      semantic: [],
      structural: [
        ".vjs-menu-content .vjs-menu-item"
      ],
      cssModule: [
        '[class*="speed"] [class*="item"]',
        '[class*="rate"] [class*="item"]'
      ],
      text: ["1X", "1.5X", "2X", "3X", "4X"]
    },
    /**
     * 进度条
     */
    progressBar: {
      semantic: [
        '[role="slider"]'
      ],
      structural: [],
      cssModule: [
        '[class*="progress-"]',
        '[class*="slider-"]'
      ]
    }
  };
  function findElement(config) {
    for (const selector of config.semantic) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    for (const selector of config.structural) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    for (const selector of config.cssModule) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }
  function findElements(config) {
    const elements = [];
    const allSelectors = [
      ...config.semantic,
      ...config.structural,
      ...config.cssModule
    ];
    for (const selector of allSelectors) {
      const els = document.querySelectorAll(selector);
      els.forEach((el) => {
        if (!elements.includes(el)) {
          elements.push(el);
        }
      });
    }
    return elements;
  }
  function findElementByText(texts) {
    var _a;
    const allButtons = document.querySelectorAll("button, a, span, div");
    for (const btn of allButtons) {
      const text = ((_a = btn.textContent) == null ? void 0 : _a.trim()) || "";
      if (texts.some((t) => text.includes(t))) {
        return btn;
      }
    }
    return null;
  }
  function validateSelectors() {
    const results = {};
    for (const [name, config] of Object.entries(SELECTORS)) {
      const el = findElement(config);
      results[name] = el !== null;
    }
    return results;
  }
  var PlayMode = /* @__PURE__ */ ((PlayMode2) => {
    PlayMode2["PROGRESS_85"] = "progress85";
    PlayMode2["FULL_PLAY"] = "fullPlay";
    return PlayMode2;
  })(PlayMode || {});
  const DEFAULT_CONFIG = {
    progressThreshold: 0.85,
    checkInterval: 2e3
  };
  class AutoPlay {
    constructor(config = {}) {
      this.intervalId = null;
      this.observer = null;
      this.videoEndedHandler = null;
      this.currentMode = "progress85";
      this.lastSwitchTime = 0;
      this.videoEndedFired = false;
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
    toggle(isEnabled) {
      isEnabled ? this.start() : this.stop();
    }
    start() {
      if (this.intervalId) {
        DebugLogger.debug("AutoPlay", "自动连播已运行");
        return;
      }
      this.startObserver();
      this.tryAttachVideoListener();
      this.intervalId = window.setInterval(() => this.checkProgress(), this.config.checkInterval);
      DebugLogger.log("AutoPlay", "自动连播已开启");
    }
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.stopObserver();
      this.detachVideoListener();
      DebugLogger.log("AutoPlay", "自动连播已关闭");
    }
    setMode(mode) {
      this.currentMode = mode;
      DebugLogger.log("AutoPlay", `连播模式已切换：${mode === "progress85" ? "85%进度" : "看完后"}`);
    }
    startObserver() {
      this.stopObserver();
      this.observer = new MutationObserver(() => {
        this.tryAttachVideoListener();
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
    stopObserver() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
    tryAttachVideoListener() {
      const video = findElement(SELECTORS.video);
      if (!video) return;
      if (this.videoEndedHandler && video.__ewtAttached) return;
      this.detachVideoListener();
      this.videoEndedHandler = () => {
        if (this.videoEndedFired) return;
        this.videoEndedFired = true;
        DebugLogger.log("AutoPlay", "视频 ended 事件触发");
        setTimeout(() => this.switchToNext(), 500);
      };
      video.addEventListener("ended", this.videoEndedHandler);
      video.__ewtAttached = true;
      DebugLogger.debug("AutoPlay", "已绑定 ended 事件");
    }
    detachVideoListener() {
      const video = findElement(SELECTORS.video);
      if (video && this.videoEndedHandler) {
        video.removeEventListener("ended", this.videoEndedHandler);
        video.__ewtAttached = false;
      }
      this.videoEndedHandler = null;
    }
    checkProgress() {
      try {
        const video = findElement(SELECTORS.video);
        if (!video) return;
        this.tryAttachVideoListener();
        const { currentTime, duration, ended } = video;
        if (isNaN(duration) || duration <= 0) return;
        if (ended && !this.videoEndedFired) {
          this.videoEndedFired = true;
          DebugLogger.log("AutoPlay", "checkProgress 检测到 video.ended");
          setTimeout(() => this.switchToNext(), 500);
          return;
        }
        if (this.currentMode === "progress85") {
          const progress = currentTime / duration;
          if (progress >= this.config.progressThreshold) {
            if (!this.videoEndedFired) {
              this.videoEndedFired = true;
              DebugLogger.log("AutoPlay", `checkProgress 达到阈值 ${Math.round(progress * 100)}%`);
              this.switchToNext();
            }
          }
        }
      } catch (error) {
        DebugLogger.error("AutoPlay", "检查进度出错", error);
      }
    }
    // ========== React Fiber 工具函数 ==========
    getReactFiber(element) {
      const key = Object.keys(element).find(
        (k) => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber")
      );
      if (!key) return null;
      return element[key];
    }
    /**
     * 从 sidebar item 向上遍历，找到包含 videoList + currentVideo hooks 的组件
     */
    findComponentHooks() {
      var _a, _b;
      const container = findElement(SELECTORS.videoList);
      if (!container) {
        DebugLogger.debug("AutoPlay", "videoList 容器未找到");
        return null;
      }
      const item = container.querySelector('[class*="item-"]');
      if (!item) {
        DebugLogger.debug("AutoPlay", "item 元素未找到");
        return null;
      }
      const fiberKey = Object.keys(item).find(
        (k) => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber")
      );
      if (!fiberKey) {
        DebugLogger.debug("AutoPlay", "React fiber key 未找到");
        return null;
      }
      const fiber = item[fiberKey];
      let current = fiber;
      let depth = 0;
      while (current && depth < 80) {
        if (current.memoizedState) {
          let hook = current.memoizedState;
          let videoListHook = null;
          let currentVideoHook = null;
          while (hook) {
            const state = hook.memoizedState;
            const hasDispatch = typeof ((_a = hook.queue) == null ? void 0 : _a.dispatch) === "function";
            if (!videoListHook && Array.isArray(state) && state.length > 0 && ((_b = state[0]) == null ? void 0 : _b.lessonId)) {
              videoListHook = hook;
            }
            if (!currentVideoHook && hasDispatch && !Array.isArray(state) && state && typeof state === "object" && state.lessonId && state.title && state.contentUrl) {
              currentVideoHook = hook;
            }
            hook = hook.next;
          }
          if (videoListHook && currentVideoHook) {
            DebugLogger.debug("AutoPlay", `找到 hooks (depth=${depth})`);
            return { videoListHook, currentVideoHook };
          }
        }
        current = current.return;
        depth++;
      }
      DebugLogger.debug("AutoPlay", `遍历完成但未匹配 hooks (depth=${depth})`);
      return null;
    }
    /**
     * 通过 dispatch 切换视频
     */
    switchVideo(targetVideo) {
      var _a, _b;
      const hooks = this.findComponentHooks();
      if (!((_b = (_a = hooks == null ? void 0 : hooks.currentVideoHook) == null ? void 0 : _a.queue) == null ? void 0 : _b.dispatch)) {
        DebugLogger.error("AutoPlay", "未找到 currentVideo dispatch");
        return false;
      }
      try {
        hooks.currentVideoHook.queue.dispatch(targetVideo);
        DebugLogger.log("AutoPlay", `dispatch 切换到: ${targetVideo.title}`);
        return true;
      } catch (e) {
        DebugLogger.error("AutoPlay", "dispatch 切换失败", e);
        return false;
      }
    }
    switchToNext(attempt = 0) {
      var _a, _b;
      const now = Date.now();
      if (now - this.lastSwitchTime < 3e3) {
        DebugLogger.debug("AutoPlay", "切换冷却中，跳过");
        return;
      }
      const hooks = this.findComponentHooks();
      if (!hooks) {
        if (attempt < 5) {
          DebugLogger.debug("AutoPlay", `hooks 未就绪，${attempt + 1}s 后重试 (${attempt + 1}/5)`);
          setTimeout(() => this.switchToNext(attempt + 1), 1e3);
        }
        return;
      }
      const videoList = ((_a = hooks.videoListHook) == null ? void 0 : _a.memoizedState) || [];
      const currentVideo = (_b = hooks.currentVideoHook) == null ? void 0 : _b.memoizedState;
      if (!videoList.length || !currentVideo) {
        DebugLogger.error("AutoPlay", "videoList 或 currentVideo 为空");
        return;
      }
      const currentIdx = videoList.findIndex((v) => v.lessonId === currentVideo.lessonId);
      DebugLogger.debug("AutoPlay", `当前: ${currentVideo.title} (idx=${currentIdx})`);
      let nextVideo = null;
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
        DebugLogger.debug("AutoPlay", "没有更多视频");
        return;
      }
      this.lastSwitchTime = now;
      this.videoEndedFired = false;
      const switched = this.switchVideo(nextVideo);
      if (switched) {
        DebugLogger.log("AutoPlay", `已切换到: ${nextVideo.title}`);
      }
    }
  }
  class AutoSkip {
    constructor(checkInterval = 1e3) {
      this.intervalId = null;
      this.checkInterval = checkInterval;
    }
    toggle(isEnabled) {
      isEnabled ? this.start() : this.stop();
    }
    start() {
      if (this.intervalId) {
        DebugLogger.debug("AutoSkip", "自动跳题已在运行");
        return;
      }
      this.intervalId = window.setInterval(() => this.checkAndSkip(), this.checkInterval);
      DebugLogger.log("AutoSkip", "自动跳题已开启");
    }
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        DebugLogger.log("AutoSkip", "自动跳题已关闭");
      }
    }
    checkAndSkip() {
      try {
        const skipButton = findElementByText(SELECTORS.skipButton.text || ["跳过"]);
        if (skipButton && !skipButton.dataset.skipClicked) {
          skipButton.dataset.skipClicked = "true";
          skipButton.click();
          DebugLogger.log("AutoSkip", "已自动跳过题目");
          setTimeout(() => delete skipButton.dataset.skipClicked, 5e3);
        }
      } catch (error) {
        DebugLogger.error("AutoSkip", "自动跳题出错", error);
      }
    }
  }
  class AutoCheckPass {
    constructor(checkInterval = 1500) {
      this.intervalId = null;
      this.checkInterval = checkInterval;
    }
    toggle(isEnabled) {
      isEnabled ? this.start() : this.stop();
    }
    start() {
      if (this.intervalId) {
        DebugLogger.debug("AutoCheckPass", "已在运行");
        return;
      }
      this.intervalId = window.setInterval(() => this.checkAndClick(), this.checkInterval);
      DebugLogger.log("AutoCheckPass", "自动过检已开启");
    }
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        DebugLogger.log("AutoCheckPass", "自动过检已关闭");
      }
    }
    checkAndClick() {
      try {
        const checkButton = findElementByText(SELECTORS.checkButton.text || ["点击通过检查"]);
        if (checkButton && !checkButton.dataset.checkClicked) {
          checkButton.dataset.checkClicked = "true";
          checkButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          DebugLogger.log("AutoCheckPass", "已自动通过检查");
          setTimeout(() => delete checkButton.dataset.checkClicked, 3e3);
        }
      } catch (error) {
        DebugLogger.error("AutoCheckPass", "过检出错", error);
      }
    }
  }
  class SpeedControl {
    constructor(checkInterval = 3e3) {
      this.intervalId = null;
      this.targetSpeed = "1X";
      this.checkInterval = checkInterval;
    }
    toggle(isEnabled) {
      if (isEnabled) {
        this.setSpeed("2X");
        this.start();
      } else {
        this.setSpeed("1X");
        this.stop();
      }
    }
    start() {
      if (this.intervalId) return;
      this.intervalId = window.setInterval(() => this.ensureSpeed(), this.checkInterval);
      DebugLogger.log("SpeedControl", "2倍速已开启");
    }
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        DebugLogger.log("SpeedControl", "2倍速已关闭");
      }
    }
    setSpeed(speed) {
      this.targetSpeed = speed;
      this.ensureSpeed();
    }
    ensureSpeed() {
      var _a;
      try {
        const speedItems = findElements(SELECTORS.speedItem);
        for (const item of speedItems) {
          const text = ((_a = item.textContent) == null ? void 0 : _a.trim()) || "";
          if (text === this.targetSpeed && !item.classList.toString().includes("active")) {
            item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            DebugLogger.log("SpeedControl", `已设为${this.targetSpeed}`);
            break;
          }
        }
      } catch (error) {
        DebugLogger.error("SpeedControl", "倍速出错", error);
      }
    }
  }
  class ProgressLock {
    constructor() {
      this.enabled = false;
      this.lastTime = 0;
      this.handler = null;
    }
    toggle(isEnabled) {
      this.enabled = isEnabled;
      if (isEnabled) {
        this.start();
      } else {
        this.stop();
      }
      DebugLogger.log("ProgressLock", `进度条锁定已${isEnabled ? "开启" : "关闭"}`);
    }
    start() {
      const video = findElement(SELECTORS.video);
      if (!video) return;
      this.lastTime = video.currentTime;
      this.handler = () => {
        if (!this.enabled) return;
        const currentTime = video.currentTime;
        const diff = currentTime - this.lastTime;
        if (Math.abs(diff) > 2 && !video.seeking) {
          DebugLogger.log("ProgressLock", `检测到自动跳转: ${this.lastTime.toFixed(1)} -> ${currentTime.toFixed(1)}`);
          video.currentTime = this.lastTime;
        } else {
          this.lastTime = currentTime;
        }
      };
      video.addEventListener("timeupdate", this.handler);
      DebugLogger.log("ProgressLock", "进度条锁定已启动");
    }
    stop() {
      const video = findElement(SELECTORS.video);
      if (video && this.handler) {
        video.removeEventListener("timeupdate", this.handler);
      }
      this.handler = null;
      DebugLogger.log("ProgressLock", "进度条锁定已停止");
    }
  }
  const DEFAULT_STATE = {
    autoSkip: false,
    autoPlay: false,
    autoCheckPass: false,
    speedControl: false,
    lockProgress: false,
    courseBrushMode: false,
    hasShownGuide: false,
    playMode: PlayMode.PROGRESS_85
  };
  class GUI {
    constructor(autoPlay2, autoSkip2, autoCheckPass2, speedControl2, progressLock2) {
      this.isMenuOpen = false;
      this.guideOverlay = null;
      this.autoPlay = autoPlay2;
      this.autoSkip = autoSkip2;
      this.autoCheckPass = autoCheckPass2;
      this.speedControl = speedControl2;
      this.progressLock = progressLock2;
      this.state = { ...DEFAULT_STATE };
    }
    init() {
      this.loadConfig();
      this.createStyles();
      this.createUI();
      this.restoreModuleStates();
      this.createGuideOverlay();
      this.autoPlay.setMode(this.state.playMode);
      DebugLogger.log("GUI", "界面初始化完成");
    }
    loadConfig() {
      try {
        const config = localStorage.getItem("ewt_helper_config");
        if (config) {
          this.state = { ...this.state, ...JSON.parse(config) };
        }
      } catch (e) {
      }
    }
    saveConfig() {
      try {
        localStorage.setItem("ewt_helper_config", JSON.stringify(this.state));
      } catch (e) {
      }
    }
    restoreModuleStates() {
      if (this.state.courseBrushMode) {
        this.enableCourseBrushMode();
        return;
      }
      if (this.state.autoSkip) this.autoSkip.toggle(true);
      if (this.state.autoPlay) this.autoPlay.toggle(true);
      if (this.state.autoCheckPass) this.autoCheckPass.toggle(true);
      if (this.state.speedControl) this.speedControl.toggle(true);
      if (this.state.lockProgress) this.progressLock.toggle(true);
    }
    createStyles() {
      const style = document.createElement("style");
      style.textContent = `
      :root {
        --ewt-primary: #3B82F6;
        --ewt-primary-hover: #2563EB;
        --ewt-danger: #EF4444;
        --ewt-danger-hover: #DC2626;
        --ewt-bg: #1E1E2E;
        --ewt-surface: #2A2A3C;
        --ewt-surface-hover: #333347;
        --ewt-border: #3A3A4C;
        --ewt-text: #E4E4E7;
        --ewt-text-secondary: #A1A1AA;
        --ewt-radius: 12px;
        --ewt-radius-sm: 8px;
      }

      .ewt-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: var(--ewt-primary);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        transition: all 0.2s ease;
        font-size: 20px;
      }
      .ewt-fab:hover {
        background: var(--ewt-primary-hover);
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
      }
      .ewt-fab:active {
        transform: scale(0.95);
      }
      .ewt-fab.active {
        background: var(--ewt-danger);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      }
      .ewt-fab.active:hover {
        background: var(--ewt-danger-hover);
      }

      .ewt-panel {
        position: fixed;
        bottom: 84px;
        right: 24px;
        z-index: 99998;
        width: 260px;
        background: var(--ewt-bg);
        border: 1px solid var(--ewt-border);
        border-radius: var(--ewt-radius);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px) scale(0.98);
        transition: all 0.2s ease;
        overflow: hidden;
      }
      .ewt-panel.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      .ewt-panel-header {
        padding: 16px 16px 12px;
        border-bottom: 1px solid var(--ewt-border);
      }
      .ewt-panel-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--ewt-text);
        letter-spacing: 0.5px;
      }
      .ewt-panel-version {
        font-size: 11px;
        color: var(--ewt-text-secondary);
        margin-top: 2px;
      }

      .ewt-panel-body {
        padding: 8px 0;
        max-height: 400px;
        overflow-y: auto;
      }
      .ewt-panel-body::-webkit-scrollbar {
        width: 4px;
      }
      .ewt-panel-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .ewt-panel-body::-webkit-scrollbar-thumb {
        background: var(--ewt-border);
        border-radius: 2px;
      }

      .ewt-section {
        padding: 4px 16px;
      }
      .ewt-section + .ewt-section {
        border-top: 1px solid var(--ewt-border);
        margin-top: 4px;
        padding-top: 12px;
      }
      .ewt-section-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--ewt-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 8px;
      }

      .ewt-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }
      .ewt-row + .ewt-row {
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }

      .ewt-label {
        font-size: 13px;
        color: var(--ewt-text);
        user-select: none;
      }
      .ewt-label.danger {
        color: var(--ewt-danger);
      }

      .ewt-toggle {
        position: relative;
        width: 36px;
        height: 20px;
        flex-shrink: 0;
      }
      .ewt-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }
      .ewt-toggle-track {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: var(--ewt-surface);
        border: 1px solid var(--ewt-border);
        border-radius: 10px;
        transition: all 0.2s ease;
      }
      .ewt-toggle-track::after {
        content: '';
        position: absolute;
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background: var(--ewt-text-secondary);
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      .ewt-toggle input:checked + .ewt-toggle-track {
        background: var(--ewt-primary);
        border-color: var(--ewt-primary);
      }
      .ewt-toggle input:checked + .ewt-toggle-track::after {
        transform: translateX(16px);
        background: white;
      }

      .ewt-mode-group {
        display: flex;
        gap: 4px;
        background: var(--ewt-surface);
        border-radius: var(--ewt-radius-sm);
        padding: 3px;
      }
      .ewt-mode-btn {
        flex: 1;
        padding: 6px 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--ewt-text-secondary);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .ewt-mode-btn:hover {
        color: var(--ewt-text);
      }
      .ewt-mode-btn.active {
        background: var(--ewt-primary);
        color: white;
        font-weight: 500;
      }

      .ewt-brush-btn {
        width: 100%;
        padding: 10px;
        border: 1px dashed var(--ewt-border);
        border-radius: var(--ewt-radius-sm);
        background: transparent;
        color: var(--ewt-text-secondary);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 4px;
      }
      .ewt-brush-btn:hover {
        border-color: var(--ewt-primary);
        color: var(--ewt-primary);
        background: rgba(59, 130, 246, 0.05);
      }
      .ewt-brush-btn.active {
        border-style: solid;
        border-color: var(--ewt-danger);
        color: var(--ewt-danger);
        background: rgba(239, 68, 68, 0.05);
      }

      .ewt-guide {
        position: fixed;
        inset: 0;
        z-index: 99997;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 24px;
        opacity: 0;
        animation: ewt-fadeIn 0.3s ease forwards;
      }
      .ewt-guide-text {
        color: white;
        font-size: 18px;
        font-weight: 500;
        text-align: center;
        line-height: 1.6;
      }
      .ewt-guide-hint {
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        animation: ewt-pulse 2s ease infinite;
      }
      @keyframes ewt-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ewt-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    `;
      document.head.appendChild(style);
    }
    createUI() {
      var _a, _b;
      (_a = document.querySelector(".ewt-fab")) == null ? void 0 : _a.remove();
      (_b = document.querySelector(".ewt-panel")) == null ? void 0 : _b.remove();
      const fab = document.createElement("button");
      fab.className = "ewt-fab";
      fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
      fab.onclick = () => this.toggleMenu();
      const panel = document.createElement("div");
      panel.className = "ewt-panel";
      panel.innerHTML = `
      <div class="ewt-panel-header">
        <div class="ewt-panel-title">EWT360 Helper</div>
        <div class="ewt-panel-version">v3.0.1 · React Fiber</div>
      </div>
      <div class="ewt-panel-body">
        <div class="ewt-section">
          <div class="ewt-section-label">连播模式</div>
          <div class="ewt-mode-group" id="ewt-mode-group">
            <button class="ewt-mode-btn ${this.state.playMode === PlayMode.PROGRESS_85 ? "active" : ""}" data-mode="progress85">85% 连播</button>
            <button class="ewt-mode-btn ${this.state.playMode === PlayMode.FULL_PLAY ? "active" : ""}" data-mode="fullPlay">看完连播</button>
          </div>
        </div>
        <div class="ewt-section">
          <div class="ewt-section-label">自动化</div>
          <div class="ewt-row">
            <span class="ewt-label">自动连播</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoPlay" ${this.state.autoPlay ? "checked" : ""}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">自动跳题</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoSkip" ${this.state.autoSkip ? "checked" : ""}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">自动过检</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoCheckPass" ${this.state.autoCheckPass ? "checked" : ""}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">2x 倍速</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-speedControl" ${this.state.speedControl ? "checked" : ""}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">锁定进度</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-lockProgress" ${this.state.lockProgress ? "checked" : ""}><span class="ewt-toggle-track"></span></label>
          </div>
        </div>
        <div class="ewt-section">
          <button class="ewt-brush-btn ${this.state.courseBrushMode ? "active" : ""}" id="ewt-brush">
            ${this.state.courseBrushMode ? "退出刷课模式" : "一键刷课"}
          </button>
        </div>
      </div>
    `;
      document.body.appendChild(fab);
      document.body.appendChild(panel);
      this.bindEvents();
    }
    bindEvents() {
      document.querySelectorAll("#ewt-mode-group .ewt-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.dataset.mode;
          this.state.playMode = mode;
          this.autoPlay.setMode(mode);
          document.querySelectorAll("#ewt-mode-group .ewt-mode-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.saveConfig();
        });
      });
      const toggles = [
        { id: "ewt-autoPlay", key: "autoPlay", handler: (v) => this.autoPlay.toggle(v) },
        { id: "ewt-autoSkip", key: "autoSkip", handler: (v) => this.autoSkip.toggle(v) },
        { id: "ewt-autoCheckPass", key: "autoCheckPass", handler: (v) => this.autoCheckPass.toggle(v) },
        { id: "ewt-speedControl", key: "speedControl", handler: (v) => this.speedControl.toggle(v) },
        { id: "ewt-lockProgress", key: "lockProgress", handler: (v) => this.progressLock.toggle(v) }
      ];
      toggles.forEach(({ id, key, handler }) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("change", () => {
            this.state[key] = el.checked;
            this.saveConfig();
            handler(el.checked);
          });
        }
      });
      const brushBtn = document.getElementById("ewt-brush");
      if (brushBtn) {
        brushBtn.addEventListener("click", () => {
          const newState = !this.state.courseBrushMode;
          this.state.courseBrushMode = newState;
          this.saveConfig();
          newState ? this.enableCourseBrushMode() : this.disableCourseBrushMode();
        });
      }
    }
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      const panel = document.querySelector(".ewt-panel");
      const fab = document.querySelector(".ewt-fab");
      this.isMenuOpen ? panel == null ? void 0 : panel.classList.add("open") : panel == null ? void 0 : panel.classList.remove("open");
      this.isMenuOpen ? fab == null ? void 0 : fab.classList.add("active") : fab == null ? void 0 : fab.classList.remove("active");
      if (this.isMenuOpen && this.guideOverlay) {
        this.guideOverlay.remove();
        this.guideOverlay = null;
        this.state.hasShownGuide = true;
        this.saveConfig();
      }
    }
    createGuideOverlay() {
      if (this.state.hasShownGuide) return;
      const overlay = document.createElement("div");
      overlay.className = "ewt-guide";
      overlay.innerHTML = `
      <div class="ewt-guide-text">
        欢迎使用 EWT360 Helper<br>
        <span style="font-size:14px;font-weight:400;opacity:0.7">点击右下角按钮打开控制面板</span>
      </div>
      <div class="ewt-guide-hint">点击任意处关闭</div>
    `;
      overlay.addEventListener("click", () => {
        overlay.remove();
        this.guideOverlay = null;
        this.state.hasShownGuide = true;
        this.saveConfig();
      });
      document.body.appendChild(overlay);
      this.guideOverlay = overlay;
    }
    enableCourseBrushMode() {
      this.setToggleState("autoSkip", true);
      this.setToggleState("autoPlay", true);
      this.setToggleState("autoCheckPass", true);
      this.setToggleState("speedControl", true);
      this.setToggleState("lockProgress", true);
      this.autoSkip.toggle(true);
      this.autoPlay.toggle(true);
      this.autoCheckPass.toggle(true);
      this.speedControl.toggle(true);
      this.progressLock.toggle(true);
      this.updateBrushButton(true);
      DebugLogger.log("GUI", "刷课模式已开启");
    }
    disableCourseBrushMode() {
      this.setToggleState("autoSkip", false);
      this.setToggleState("autoPlay", false);
      this.setToggleState("autoCheckPass", false);
      this.setToggleState("speedControl", false);
      this.setToggleState("lockProgress", false);
      this.autoSkip.toggle(false);
      this.autoPlay.toggle(false);
      this.autoCheckPass.toggle(false);
      this.speedControl.toggle(false);
      this.progressLock.toggle(false);
      this.updateBrushButton(false);
      DebugLogger.log("GUI", "刷课模式已关闭");
    }
    setToggleState(id, checked) {
      this.state[id] = checked;
      this.saveConfig();
      const el = document.getElementById(`ewt-${id}`);
      if (el) el.checked = checked;
    }
    updateBrushButton(active) {
      const btn = document.getElementById("ewt-brush");
      if (btn) {
        btn.classList.toggle("active", active);
        btn.textContent = active ? "退出刷课模式" : "一键刷课";
      }
    }
  }
  installIsTrustedBypass();
  const autoPlay = new AutoPlay();
  const autoSkip = new AutoSkip();
  const autoCheckPass = new AutoCheckPass();
  const speedControl = new SpeedControl();
  const progressLock = new ProgressLock();
  const gui = new GUI(autoPlay, autoSkip, autoCheckPass, speedControl, progressLock);
  function init() {
    if (!document.body) {
      setTimeout(init, 500);
      return;
    }
    try {
      if (DebugLogger.enabled) {
        const results = validateSelectors();
        DebugLogger.log("Init", "选择器验证结果", results);
      }
      gui.init();
    } catch (e) {
      DebugLogger.error("Init", "初始化失败", e);
    }
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
  window.addEventListener("load", init);
  new MutationObserver((mutations, observer) => {
    if (document.body && !document.querySelector(".ewt-helper-container")) {
      init();
      observer.disconnect();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.EWT360Helper = {
    autoPlay,
    autoSkip,
    autoCheckPass,
    speedControl,
    progressLock,
    gui,
    DebugLogger,
    validateSelectors,
    PlayMode
  };
})();
