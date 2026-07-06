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
        ".task-list-container-PwS3c",
        ".play_video_main_content_box"
      ],
      cssModule: [
        '[class*="task-list-container"]',
        '[class*="videos-"]'
      ]
    },
    /**
     * 视频项
     */
    videoItem: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="video-item-"]',
        '[class*="video-"]'
      ]
    },
    /**
     * 当前激活的视频项
     */
    activeVideo: {
      semantic: [
        '[aria-current="true"]'
      ],
      structural: [],
      cssModule: [
        '[class*="actived-"]',
        '[class*="active-"]',
        '[class*="current-"]'
      ]
    },
    /**
     * 已完成的视频项
     */
    completedVideo: {
      semantic: [],
      structural: [],
      cssModule: [
        '[class*="success-"]',
        '[class*="completed-"]',
        '[class*="finished-"]'
      ],
      text: ["已完成"]
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
  function matchesSelector(element, config) {
    var _a;
    if (!element) return false;
    for (const selector of config.semantic) {
      if (element.matches(selector)) return true;
    }
    for (const selector of config.structural) {
      if (element.matches(selector)) return true;
    }
    for (const selector of config.cssModule) {
      if (element.matches(selector)) return true;
    }
    if (config.text) {
      const text = ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
      if (config.text.some((t) => text.includes(t))) return true;
    }
    return false;
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
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.boundSwitchToNext = this.switchToNext.bind(this);
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
      if (mode === "progress85") {
        this.config.progressThreshold = 0.85;
      }
      DebugLogger.log("AutoPlay", `连播模式已切换：${mode === "progress85" ? "85%进度" : "看完后"}`);
    }
    startObserver() {
      this.stopObserver();
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node;
                if (el.tagName === "VIDEO" || el.querySelector("video")) {
                  DebugLogger.debug("AutoPlay", "检测到 video 元素添加");
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
      DebugLogger.debug("AutoPlay", "MutationObserver 已启动");
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
        DebugLogger.log("AutoPlay", "视频 ended 事件触发");
        this.switchToNext();
      };
      video.addEventListener("ended", this.videoEndedHandler);
      video.__ewtAttached = true;
      DebugLogger.debug("AutoPlay", "已绑定 video ended 事件");
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
        if (this.currentMode !== "progress85") return;
        const current = video.currentTime;
        const total = video.duration;
        if (isNaN(total) || total <= 0) return;
        const progress = current / total;
        DebugLogger.debug("AutoPlay", `进度: ${(progress * 100).toFixed(1)}%`);
        if (progress >= this.config.progressThreshold) {
          this.switchToNext();
        }
      } catch (error) {
        DebugLogger.error("AutoPlay", "检查进度出错", error);
      }
    }
    switchToNext() {
      const now = Date.now();
      if (now - this.lastSwitchTime < 3e3) {
        DebugLogger.debug("AutoPlay", "切换冷却中，跳过");
        return;
      }
      const activeVideo = this.findActiveVideo();
      if (!activeVideo) {
        DebugLogger.debug("AutoPlay", "未找到当前激活的视频项");
        return;
      }
      const nextVideo = this.findNextVideo(activeVideo);
      if (nextVideo) {
        this.lastSwitchTime = now;
        DebugLogger.log("AutoPlay", "找到下一个视频，准备切换");
        nextVideo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        DebugLogger.log("AutoPlay", "已自动切换下一个视频");
      } else {
        DebugLogger.debug("AutoPlay", "没有更多视频");
      }
    }
    findNextVideo(current) {
      var _a;
      let next = current.nextElementSibling;
      while (next) {
        if (!this.isCompleted(next)) {
          return next;
        }
        next = next.nextElementSibling;
      }
      next = current.nextElementSibling;
      if (next) {
        return next;
      }
      const firstChild = (_a = current.parentElement) == null ? void 0 : _a.firstElementChild;
      if (firstChild && firstChild !== current) {
        return firstChild;
      }
      return null;
    }
    findActiveVideo() {
      const semanticEl = findElement(SELECTORS.activeVideo);
      if (semanticEl) return semanticEl;
      const container = findElement(SELECTORS.videoList);
      if (!container) return null;
      const items = container.querySelectorAll('[class*="video-item-"], [class*="video-"]');
      for (const item of items) {
        if (matchesSelector(item, SELECTORS.activeVideo)) {
          return item;
        }
      }
      for (const item of items) {
        const style = window.getComputedStyle(item);
        if (style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent" && style.backgroundColor !== "rgb(255, 255, 255)") {
          return item;
        }
      }
      return null;
    }
    isCompleted(item) {
      return matchesSelector(item, SELECTORS.completedVideo);
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
      this.createMenuButton();
      this.createMenuPanel();
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
      .ewt-helper-container{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:Arial,sans-serif;}
      .ewt-menu-button{width:50px;height:50px;border-radius:50%;background:#4CAF50;color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 8px rgba(0,0,0,0.2);transition:all .3s;}
      .ewt-menu-button:hover{background:#45a049;transform:scale(1.05);}
      .ewt-menu-panel{position:absolute;bottom:60px;right:0;width:280px;background:white;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:15px;display:none;flex-direction:column;gap:10px;}
      .ewt-menu-panel.open{display:flex;}
      .ewt-menu-title{font-size:18px;font-weight:bold;color:#333;margin-bottom:10px;text-align:center;padding-bottom:5px;border-bottom:1px solid #eee;}
      .ewt-toggle-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;}
      .ewt-toggle-label{font-size:14px;color:#555;}
      .ewt-toggle-label.brush-mode{color:#2196F3;font-weight:bold;}
      .ewt-playmode-group{padding:8px 0;border-bottom:1px solid #f5f5f5;}
      .ewt-playmode-title{font-size:14px;color:#555;margin-bottom:8px;}
      .ewt-playmode-buttons{display:flex;gap:8px;}
      .ewt-playmode-btn{flex:1;padding:6px 0;border-radius:4px;border:1px solid #ddd;background:#fff;color:#555;cursor:pointer;text-align:center;font-size:13px;transition:all .2s;}
      .ewt-playmode-btn.active{background:#4CAF50;color:white;border-color:#4CAF50;}
      .ewt-playmode-btn:hover{background:#f5f5f5;}
      .ewt-playmode-btn.active:hover{background:#45a049;}
      .ewt-switch{position:relative;display:inline-block;width:40px;height:24px;}
      .ewt-switch input{opacity:0;width:0;height:0;}
      .ewt-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;transition:.4s;border-radius:24px;}
      .ewt-slider:before{position:absolute;content:"";height:16px;width:16px;left:4px;bottom:4px;background:white;transition:.4s;border-radius:50%;}
      input:checked+.ewt-slider{background:#4CAF50;}
      input:checked+.ewt-slider:before{transform:translateX(16px);}
      .ewt-guide-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99998;display:flex;flex-direction:column;justify-content:center;align-items:center;}
      .ewt-guide-text{color:white;font-size:24px;font-weight:bold;margin-bottom:20px;text-align:center;line-height:1.5;}
      .ewt-guide-arrow{position:fixed;bottom:80px;right:80px;color:white;font-size:60px;font-weight:bold;animation:ewt-bounce 1.5s infinite;transform:rotate(45deg);}
      @keyframes ewt-bounce{0%,100%{transform:translate(0,0) rotate(45deg);}50%{transform:translate(15px,15px) rotate(45deg);}}
    `;
      document.head.appendChild(style);
    }
    createMenuButton() {
      const oldContainer = document.querySelector(".ewt-helper-container");
      if (oldContainer) oldContainer.remove();
      const container = document.createElement("div");
      container.className = "ewt-helper-container";
      const btn = document.createElement("button");
      btn.className = "ewt-menu-button";
      btn.innerHTML = "📚";
      btn.onclick = () => this.toggleMenu();
      container.appendChild(btn);
      document.body.appendChild(container);
    }
    createGuideOverlay() {
      if (this.state.hasShownGuide) return;
      const overlay = document.createElement("div");
      overlay.className = "ewt-guide-overlay";
      const text = document.createElement("div");
      text.className = "ewt-guide-text";
      text.innerHTML = "欢迎使用升学E网通助手！<br>请点击右下角绿色图标打开控制面板";
      const arrow = document.createElement("div");
      arrow.className = "ewt-guide-arrow";
      arrow.textContent = "👉";
      overlay.appendChild(text);
      overlay.appendChild(arrow);
      document.body.appendChild(overlay);
      this.guideOverlay = overlay;
    }
    createMenuPanel() {
      var _a;
      const panel = document.createElement("div");
      panel.className = "ewt-menu-panel";
      const title = document.createElement("div");
      title.className = "ewt-menu-title";
      title.textContent = "升学E网通助手";
      panel.appendChild(title);
      panel.appendChild(this.createPlayModeGroup());
      panel.appendChild(this.createToggleItem("autoSkip", "自动跳题", (v) => this.autoSkip.toggle(v)));
      panel.appendChild(this.createToggleItem("autoPlay", "自动连播", (v) => this.autoPlay.toggle(v)));
      panel.appendChild(this.createToggleItem("autoCheckPass", "自动过检", (v) => this.autoCheckPass.toggle(v)));
      panel.appendChild(this.createToggleItem("speedControl", "2倍速播放", (v) => this.speedControl.toggle(v)));
      panel.appendChild(this.createToggleItem("lockProgress", "锁定进度条", (v) => this.progressLock.toggle(v)));
      panel.appendChild(this.createToggleItem("courseBrushMode", "刷课模式", (v) => {
        v ? this.enableCourseBrushMode() : this.disableCourseBrushMode();
      }, true));
      (_a = document.querySelector(".ewt-helper-container")) == null ? void 0 : _a.appendChild(panel);
    }
    createPlayModeGroup() {
      const group = document.createElement("div");
      group.className = "ewt-playmode-group";
      const title = document.createElement("div");
      title.className = "ewt-playmode-title";
      title.textContent = "连播模式选择";
      group.appendChild(title);
      const buttons = document.createElement("div");
      buttons.className = "ewt-playmode-buttons";
      const btn85 = document.createElement("button");
      btn85.className = `ewt-playmode-btn ${this.state.playMode === PlayMode.PROGRESS_85 ? "active" : ""}`;
      btn85.textContent = "85%进度连播";
      btn85.onclick = () => {
        this.state.playMode = PlayMode.PROGRESS_85;
        this.autoPlay.setMode(PlayMode.PROGRESS_85);
        this.updatePlayModeButtons();
        this.saveConfig();
      };
      const btnFull = document.createElement("button");
      btnFull.className = `ewt-playmode-btn ${this.state.playMode === PlayMode.FULL_PLAY ? "active" : ""}`;
      btnFull.textContent = "看完后连播";
      btnFull.onclick = () => {
        this.state.playMode = PlayMode.FULL_PLAY;
        this.autoPlay.setMode(PlayMode.FULL_PLAY);
        this.updatePlayModeButtons();
        this.saveConfig();
      };
      buttons.appendChild(btn85);
      buttons.appendChild(btnFull);
      group.appendChild(buttons);
      return group;
    }
    updatePlayModeButtons() {
      var _a, _b;
      const btns = document.querySelectorAll(".ewt-playmode-btn");
      btns.forEach((b) => b.classList.remove("active"));
      if (this.state.playMode === PlayMode.PROGRESS_85) {
        (_a = btns[0]) == null ? void 0 : _a.classList.add("active");
      } else {
        (_b = btns[1]) == null ? void 0 : _b.classList.add("active");
      }
    }
    createToggleItem(id, label, onChange, isBrush = false) {
      const item = document.createElement("div");
      item.className = "ewt-toggle-item";
      const lab = document.createElement("label");
      lab.className = `ewt-toggle-label ${isBrush ? "brush-mode" : ""}`;
      lab.textContent = label;
      const sw = document.createElement("label");
      sw.className = "ewt-switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `ewt-toggle-${id}`;
      input.checked = this.state[id];
      const slider = document.createElement("span");
      slider.className = "ewt-slider";
      sw.appendChild(input);
      sw.appendChild(slider);
      item.appendChild(lab);
      item.appendChild(sw);
      input.onchange = (e) => {
        const target = e.target;
        this.state[id] = target.checked;
        this.saveConfig();
        onChange(target.checked);
      };
      return item;
    }
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      const panel = document.querySelector(".ewt-menu-panel");
      this.isMenuOpen ? panel == null ? void 0 : panel.classList.add("open") : panel == null ? void 0 : panel.classList.remove("open");
      if (this.isMenuOpen && this.guideOverlay) {
        this.guideOverlay.remove();
        this.guideOverlay = null;
        this.state.hasShownGuide = true;
        this.saveConfig();
      }
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
      DebugLogger.log("GUI", "刷课模式已关闭");
    }
    setToggleState(id, checked) {
      this.state[id] = checked;
      this.saveConfig();
      const el = document.getElementById(`ewt-toggle-${id}`);
      if (el) el.checked = checked;
    }
  }
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
