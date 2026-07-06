/**
 * EWT360 Helper - 主入口
 * 
 * 升学E网通助手用户脚本
 * 自动连播、自动过检、自动跳题、强制倍速
 */

import { DebugLogger } from './utils/DebugLogger';
import { AutoPlay, PlayMode } from './modules/AutoPlay';
import { AutoSkip } from './modules/AutoSkip';
import { AutoCheckPass } from './modules/AutoCheckPass';
import { SpeedControl } from './modules/SpeedControl';
import { ProgressLock } from './modules/ProgressLock';
import { GUI } from './gui';
import { validateSelectors } from './selectors';

// 创建模块实例
const autoPlay = new AutoPlay();
const autoSkip = new AutoSkip();
const autoCheckPass = new AutoCheckPass();
const speedControl = new SpeedControl();
const progressLock = new ProgressLock();

// 创建 GUI 实例
const gui = new GUI(autoPlay, autoSkip, autoCheckPass, speedControl, progressLock);

// 初始化
function init(): void {
  if (!document.body) {
    setTimeout(init, 500);
    return;
  }

  try {
    // 验证选择器（调试用）
    if (DebugLogger.enabled) {
      const results = validateSelectors();
      DebugLogger.log('Init', '选择器验证结果', results);
    }

    gui.init();
  } catch (e) {
    DebugLogger.error('Init', '初始化失败', e);
  }
}

// 启动
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

window.addEventListener('load', init);

// 监听 DOM 变化，防止脚本被移除
new MutationObserver((mutations, observer) => {
  if (document.body && !document.querySelector('.ewt-helper-container')) {
    init();
    observer.disconnect();
  }
}).observe(document.documentElement, { childList: true, subtree: true });

// 导出到全局（调试用）
(window as any).EWT360Helper = {
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
