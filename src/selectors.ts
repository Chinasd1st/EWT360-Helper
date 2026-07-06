/**
 * 选择器注册表
 * 
 * 所有 CSS 选择器集中管理，当 EWT360 更新页面结构时，
 * 只需修改此文件即可，无需改动业务逻辑。
 * 
 * 选择器策略（按优先级）：
 * 1. 语义化选择器：role, aria-*, data-* 属性（最稳定）
 * 2. 结构化选择器：基于 DOM 层级关系
 * 3. 文本匹配：基于元素文本内容
 * 4. CSS Module 选择器：带哈希的类名（最不稳定，随构建变化）
 */

export interface SelectorConfig {
  // 语义化选择器（优先使用）
  semantic: string[];
  // 结构化选择器
  structural: string[];
  // CSS Module 选择器（需随版本更新）
  cssModule: string[];
  // 文本匹配（最稳定）
  text?: string[];
}

/**
 * 视频播放器相关选择器
 */
export const SELECTORS = {
  /**
   * 视频元素
   */
  video: {
    semantic: ['video'],
    structural: [],
    cssModule: []
  } as SelectorConfig,

  /**
   * 视频播放器容器
   */
  videoPlayer: {
    semantic: [
      '[role="region"][aria-label="视频播放器"]'
    ],
    structural: [
      '.play_video_main_box',
      '[class*="player-wrapper"]'
    ],
    cssModule: []
  } as SelectorConfig,

  /**
   * 视频列表容器
   */
  videoList: {
    semantic: [],
    structural: [
      '.task-list-container-PwS3c',
      '.play_video_main_content_box'
    ],
    cssModule: [
      '[class*="task-list-container"]',
      '[class*="videos-"]'
    ]
  } as SelectorConfig,

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
  } as SelectorConfig,

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
  } as SelectorConfig,

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
    text: ['已完成']
  } as SelectorConfig,

  /**
   * 通过检查按钮
   */
  checkButton: {
    semantic: [],
    structural: [],
    cssModule: [
      '[class*="btn-"]'
    ],
    text: ['点击通过检查', '通过检查', '确认']
  } as SelectorConfig,

  /**
   * 跳过按钮
   */
  skipButton: {
    semantic: [],
    structural: [],
    cssModule: [],
    text: ['跳过']
  } as SelectorConfig,

  /**
   * 速度菜单项
   */
  speedItem: {
    semantic: [],
    structural: [
      '.vjs-menu-content .vjs-menu-item'
    ],
    cssModule: [
      '[class*="speed"] [class*="item"]',
      '[class*="rate"] [class*="item"]'
    ],
    text: ['1X', '1.5X', '2X', '3X', '4X']
  } as SelectorConfig,

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
  } as SelectorConfig
};

/**
 * 元素查找器
 * 按照选择器优先级依次尝试查找
 */
export function findElement(config: SelectorConfig): HTMLElement | null {
  // 1. 优先使用语义化选择器
  for (const selector of config.semantic) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }

  // 2. 使用结构化选择器
  for (const selector of config.structural) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }

  // 3. 使用 CSS Module 选择器
  for (const selector of config.cssModule) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }

  return null;
}

/**
 * 查找所有匹配的元素
 */
export function findElements(config: SelectorConfig): HTMLElement[] {
  const elements: HTMLElement[] = [];

  // 收集所有选择器
  const allSelectors = [
    ...config.semantic,
    ...config.structural,
    ...config.cssModule
  ];

  for (const selector of allSelectors) {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      if (!elements.includes(el as HTMLElement)) {
        elements.push(el as HTMLElement);
      }
    });
  }

  return elements;
}

/**
 * 按文本内容查找元素
 */
export function findElementByText(texts: string[]): HTMLElement | null {
  const allButtons = document.querySelectorAll('button, a, span, div');
  for (const btn of allButtons) {
    const text = btn.textContent?.trim() || '';
    if (texts.some(t => text.includes(t))) {
      return btn as HTMLElement;
    }
  }
  return null;
}

/**
 * 检查元素是否匹配选择器配置
 */
export function matchesSelector(element: HTMLElement, config: SelectorConfig): boolean {
  if (!element) return false;

  // 检查语义化选择器
  for (const selector of config.semantic) {
    if (element.matches(selector)) return true;
  }

  // 检查结构化选择器
  for (const selector of config.structural) {
    if (element.matches(selector)) return true;
  }

  // 检查 CSS Module 选择器
  for (const selector of config.cssModule) {
    if (element.matches(selector)) return true;
  }

  // 检查文本匹配
  if (config.text) {
    const text = element.textContent?.trim() || '';
    if (config.text.some(t => text.includes(t))) return true;
  }

  return false;
}

/**
 * 检查所有选择器是否有效（用于测试/调试）
 */
export function validateSelectors(): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  for (const [name, config] of Object.entries(SELECTORS)) {
    const el = findElement(config as SelectorConfig);
    results[name] = el !== null;
  }

  return results;
}
