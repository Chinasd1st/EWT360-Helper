/**
 * GUI 界面模块 v3 - 工具感设计
 */

import { DebugLogger } from '../utils/DebugLogger';
import { PlayMode } from '../modules/AutoPlay';
import { AutoPlay } from '../modules/AutoPlay';
import { AutoSkip } from '../modules/AutoSkip';
import { AutoCheckPass } from '../modules/AutoCheckPass';
import { SpeedControl } from '../modules/SpeedControl';
import { ProgressLock } from '../modules/ProgressLock';

export interface GUIState {
  autoSkip: boolean;
  autoPlay: boolean;
  autoCheckPass: boolean;
  speedControl: boolean;
  lockProgress: boolean;
  courseBrushMode: boolean;
  hasShownGuide: boolean;
  playMode: PlayMode;
}

const DEFAULT_STATE: GUIState = {
  autoSkip: false,
  autoPlay: false,
  autoCheckPass: false,
  speedControl: false,
  lockProgress: false,
  courseBrushMode: false,
  hasShownGuide: false,
  playMode: PlayMode.PROGRESS_85
};

export class GUI {
  private isMenuOpen: boolean = false;
  private state: GUIState;
  private guideOverlay: HTMLElement | null = null;

  private autoPlay: AutoPlay;
  private autoSkip: AutoSkip;
  private autoCheckPass: AutoCheckPass;
  private speedControl: SpeedControl;
  private progressLock: ProgressLock;

  constructor(
    autoPlay: AutoPlay,
    autoSkip: AutoSkip,
    autoCheckPass: AutoCheckPass,
    speedControl: SpeedControl,
    progressLock: ProgressLock
  ) {
    this.autoPlay = autoPlay;
    this.autoSkip = autoSkip;
    this.autoCheckPass = autoCheckPass;
    this.speedControl = speedControl;
    this.progressLock = progressLock;
    this.state = { ...DEFAULT_STATE };
  }

  init(): void {
    this.loadConfig();
    this.createStyles();
    this.createUI();
    this.restoreModuleStates();
    this.createGuideOverlay();
    this.autoPlay.setMode(this.state.playMode);
    DebugLogger.log('GUI', '界面初始化完成');
  }

  private loadConfig(): void {
    try {
      const config = localStorage.getItem('ewt_helper_config');
      if (config) {
        this.state = { ...this.state, ...JSON.parse(config) };
      }
    } catch (e) {}
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('ewt_helper_config', JSON.stringify(this.state));
    } catch (e) {}
  }

  private restoreModuleStates(): void {
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

  private createStyles(): void {
    const style = document.createElement('style');
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

  private createUI(): void {
    document.querySelector('.ewt-fab')?.remove();
    document.querySelector('.ewt-panel')?.remove();

    const fab = document.createElement('button');
    fab.className = 'ewt-fab';
    fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
    fab.onclick = () => this.toggleMenu();

    const panel = document.createElement('div');
    panel.className = 'ewt-panel';

    panel.innerHTML = `
      <div class="ewt-panel-header">
        <div class="ewt-panel-title">EWT360 Helper</div>
        <div class="ewt-panel-version">v3.0.1 · React Fiber</div>
      </div>
      <div class="ewt-panel-body">
        <div class="ewt-section">
          <div class="ewt-section-label">连播模式</div>
          <div class="ewt-mode-group" id="ewt-mode-group">
            <button class="ewt-mode-btn ${this.state.playMode === PlayMode.PROGRESS_85 ? 'active' : ''}" data-mode="progress85">85% 连播</button>
            <button class="ewt-mode-btn ${this.state.playMode === PlayMode.FULL_PLAY ? 'active' : ''}" data-mode="fullPlay">看完连播</button>
          </div>
        </div>
        <div class="ewt-section">
          <div class="ewt-section-label">自动化</div>
          <div class="ewt-row">
            <span class="ewt-label">自动连播</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoPlay" ${this.state.autoPlay ? 'checked' : ''}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">自动跳题</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoSkip" ${this.state.autoSkip ? 'checked' : ''}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">自动过检</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-autoCheckPass" ${this.state.autoCheckPass ? 'checked' : ''}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">2x 倍速</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-speedControl" ${this.state.speedControl ? 'checked' : ''}><span class="ewt-toggle-track"></span></label>
          </div>
          <div class="ewt-row">
            <span class="ewt-label">锁定进度</span>
            <label class="ewt-toggle"><input type="checkbox" id="ewt-lockProgress" ${this.state.lockProgress ? 'checked' : ''}><span class="ewt-toggle-track"></span></label>
          </div>
        </div>
        <div class="ewt-section">
          <button class="ewt-brush-btn ${this.state.courseBrushMode ? 'active' : ''}" id="ewt-brush">
            ${this.state.courseBrushMode ? '退出刷课模式' : '一键刷课'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    this.bindEvents();
  }

  private bindEvents(): void {
    // Mode buttons
    document.querySelectorAll('#ewt-mode-group .ewt-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as PlayMode;
        this.state.playMode = mode;
        this.autoPlay.setMode(mode);
        document.querySelectorAll('#ewt-mode-group .ewt-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.saveConfig();
      });
    });

    // Toggle switches
    const toggles: Array<{ id: string; key: keyof GUIState; handler: (v: boolean) => void }> = [
      { id: 'ewt-autoPlay', key: 'autoPlay', handler: v => this.autoPlay.toggle(v) },
      { id: 'ewt-autoSkip', key: 'autoSkip', handler: v => this.autoSkip.toggle(v) },
      { id: 'ewt-autoCheckPass', key: 'autoCheckPass', handler: v => this.autoCheckPass.toggle(v) },
      { id: 'ewt-speedControl', key: 'speedControl', handler: v => this.speedControl.toggle(v) },
      { id: 'ewt-lockProgress', key: 'lockProgress', handler: v => this.progressLock.toggle(v) },
    ];

    toggles.forEach(({ id, key, handler }) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.addEventListener('change', () => {
          this.state[key] = el.checked as never;
          this.saveConfig();
          handler(el.checked);
        });
      }
    });

    // Brush mode
    const brushBtn = document.getElementById('ewt-brush');
    if (brushBtn) {
      brushBtn.addEventListener('click', () => {
        const newState = !this.state.courseBrushMode;
        this.state.courseBrushMode = newState;
        this.saveConfig();
        newState ? this.enableCourseBrushMode() : this.disableCourseBrushMode();
      });
    }
  }

  private toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    const panel = document.querySelector('.ewt-panel');
    const fab = document.querySelector('.ewt-fab');

    this.isMenuOpen ? panel?.classList.add('open') : panel?.classList.remove('open');
    this.isMenuOpen ? fab?.classList.add('active') : fab?.classList.remove('active');

    if (this.isMenuOpen && this.guideOverlay) {
      this.guideOverlay.remove();
      this.guideOverlay = null;
      this.state.hasShownGuide = true;
      this.saveConfig();
    }
  }

  private createGuideOverlay(): void {
    if (this.state.hasShownGuide) return;

    const overlay = document.createElement('div');
    overlay.className = 'ewt-guide';

    overlay.innerHTML = `
      <div class="ewt-guide-text">
        欢迎使用 EWT360 Helper<br>
        <span style="font-size:14px;font-weight:400;opacity:0.7">点击右下角按钮打开控制面板</span>
      </div>
      <div class="ewt-guide-hint">点击任意处关闭</div>
    `;

    overlay.addEventListener('click', () => {
      overlay.remove();
      this.guideOverlay = null;
      this.state.hasShownGuide = true;
      this.saveConfig();
    });

    document.body.appendChild(overlay);
    this.guideOverlay = overlay;
  }

  private enableCourseBrushMode(): void {
    this.setToggleState('autoSkip', true);
    this.setToggleState('autoPlay', true);
    this.setToggleState('autoCheckPass', true);
    this.setToggleState('speedControl', true);
    this.setToggleState('lockProgress', true);
    this.autoSkip.toggle(true);
    this.autoPlay.toggle(true);
    this.autoCheckPass.toggle(true);
    this.speedControl.toggle(true);
    this.progressLock.toggle(true);
    this.updateBrushButton(true);
    DebugLogger.log('GUI', '刷课模式已开启');
  }

  private disableCourseBrushMode(): void {
    this.setToggleState('autoSkip', false);
    this.setToggleState('autoPlay', false);
    this.setToggleState('autoCheckPass', false);
    this.setToggleState('speedControl', false);
    this.setToggleState('lockProgress', false);
    this.autoSkip.toggle(false);
    this.autoPlay.toggle(false);
    this.autoCheckPass.toggle(false);
    this.speedControl.toggle(false);
    this.progressLock.toggle(false);
    this.updateBrushButton(false);
    DebugLogger.log('GUI', '刷课模式已关闭');
  }

  private setToggleState(id: keyof GUIState, checked: boolean): void {
    this.state[id] = checked as never;
    this.saveConfig();
    const el = document.getElementById(`ewt-${id}`) as HTMLInputElement | null;
    if (el) el.checked = checked;
  }

  private updateBrushButton(active: boolean): void {
    const btn = document.getElementById('ewt-brush');
    if (btn) {
      btn.classList.toggle('active', active);
      btn.textContent = active ? '退出刷课模式' : '一键刷课';
    }
  }
}
